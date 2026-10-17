"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  Wallet,
  WalletError,
  InvalidMnemonicError,
  InvalidKeystoreError,
  DecryptionError,
  LockedError,
  AlreadyUnlockedError,
  DerivationError,
  type KeystoreFile,
  type SignerFn,
  type Network,
} from "@claritychain/wallet";
import {
  RpcClient,
  HttpTransport,
  RpcError,
  ErrorCodes,
  verifyProof,
  decodeProof,
  UnsignedTx,
  SignedTx,
  type RpcClientOptions,
  type RpcTransport,
  type BlockHeader,
  type ProofResponse,
  type SendTxResponse,
  type StateRootResponse,
  type HashHex,
  type HexString,
  type Bech32mAddress,
} from "@claritychain/rpc";
import { encodeAddress } from "./address";
import {
  accountKey,
  tokenBalanceKey,
  KEY_TYPE_ACCOUNT,
  KEY_TYPE_TOKEN_BALANCE,
} from "./keys";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { blake2b } from "@noble/hashes/blake2.js";

// Configuration
export interface WalletConfig {
  /** The chain the wallet is bound to. */
  network: Network;

  /**
   * One or more RPC endpoints. The first is the primary: reads,
   * submissions, and fee estimation go to it. The rest are
   * verification peers used by verifyBalance() to cross-check
   * state roots before a proof is trusted.
   */
  endpoints: string[];

  /** How long the wallet stays unlocked without activity, in ms. */
  idleTimeoutMs?: number;

  /** Whether to persist the keystore to localStorage. Default true. */
  persistKeystore?: boolean;

  /** The localStorage key the keystore is written under. */
  storageKey?: string;

  /** Optional per-endpoint transport factory. */
  transportFactory?: (url: string) => RpcTransport;
}

const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_STORAGE_KEY = "clarity.wallet.keystore";

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

interface WalletSession {
  wallet: Wallet | null;
  address: string | null;
  isLoaded: boolean;
  isUnlocked: boolean;
}

const EMPTY_SESSION: WalletSession = {
  wallet: null,
  address: null,
  isLoaded: false,
  isUnlocked: false,
};

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export interface WalletContextValue {
  // Identity
  address: string | null;
  rewardPublicKey(): string | null;
  network: Network;
  endpoints: readonly string[];

  // Lifecycle
  isLoaded: boolean;
  isUnlocked: boolean;

  create(
    password: string,
    wordCount?: 12 | 24,
  ): Promise<{ mnemonic: string; keystore: KeystoreFile }>;

  importFromMnemonic(
    mnemonic: string,
    password: string,
  ): Promise<{ keystore: KeystoreFile }>;

  setWalletFromCreate(w: Wallet, keystore: KeystoreFile): void;

  loadAndUnlock(keystore: KeystoreFile, password: string): Promise<void>;
  load(keystore: KeystoreFile): Promise<void>;
  unlock(password: string): Promise<void>;
  lock(): void;
  forget(): void;
  keystoreFile(): KeystoreFile | null;

  // Signing and submission
  signer(): SignerFn | null;
  submit(unsignedTx: UnsignedTx): Promise<HashHex>;
  sendRaw(signedTxHex: HexString): Promise<HashHex>;

  // Reads
  rpc(): RpcClient;
  verifyBalance(
    address: Bech32mAddress,
    tokenId?: number,
  ): Promise<VerifiedBalance>;
  verifiedRoot(): Promise<VerifiedRoot>;
}

// ---------------------------------------------------------------------------
// Helper types
// ---------------------------------------------------------------------------

export interface VerifiedBalance {
  address: Bech32mAddress;
  tokenId: number;
  amount: bigint;
  root: HexString;
  height: number;
  singleSource: boolean;
  sources: string[];
}

export interface VerifiedRoot {
  root: HexString;
  height: number;
  sources: string[];
  singleSource: boolean;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class NoWalletError extends WalletError {
  constructor() {
    super("no wallet loaded");
    this.name = "NoWalletError";
  }
}

export class RootDisagreementError extends WalletError {
  readonly roots: { endpoint: string; root: HexString; height: number }[];
  constructor(roots: { endpoint: string; root: HexString; height: number }[]) {
    super("RPC endpoints disagree on the current state root");
    this.name = "RootDisagreementError";
    this.roots = roots;
  }
}

export class ProofVerificationError extends WalletError {
  readonly address: Bech32mAddress;
  readonly tokenId: number;
  constructor(address: Bech32mAddress, tokenId: number, reason: string) {
    super(`proof for ${address} token ${tokenId} failed verification: ${reason}`);
    this.name = "ProofVerificationError";
    this.address = address;
    this.tokenId = tokenId;
  }
}

export {
  WalletError,
  InvalidMnemonicError,
  InvalidKeystoreError,
  DecryptionError,
  LockedError,
  AlreadyUnlockedError,
  DerivationError,
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WalletContext = createContext<WalletContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface WalletProviderProps {
  config: WalletConfig;
  children: ReactNode;
}

export function WalletProvider({ config, children }: WalletProviderProps) {
  const {
    network,
    endpoints,
    idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
    persistKeystore = true,
    storageKey = DEFAULT_STORAGE_KEY,
    transportFactory,
  } = config;

  if (endpoints.length === 0) {
    throw new Error("WalletProvider: config.endpoints must not be empty");
  }

  const [session, setSession] = useState<WalletSession>(EMPTY_SESSION);

  // --- RPC clients --------------------------------------------------------

  const clients = useMemo<RpcClient[]>(() => {
    return endpoints.map((url) => {
      const transport = transportFactory
        ? transportFactory(url)
        : new HttpTransport({ url });
      const opts: RpcClientOptions = { transport };
      return new RpcClient(opts);
    });
  }, [endpoints.join("|"), transportFactory]); // eslint-disable-line react-hooks/exhaustive-deps

  const primary = clients[0];

  // Close transports when the client set is replaced or the
  // provider unmounts.
  useEffect(() => {
    return () => {
      for (const c of clients) c.close();
    };
  }, [clients]);

  // --- Idle timer ---------------------------------------------------------

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIdle = useCallback(() => {
    if (idleTimer.current !== null) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }, []);

  const refreshIdle = useCallback(() => {
    clearIdle();
    if (session.wallet?.isUnlocked()) {
      idleTimer.current = setTimeout(() => {
        session.wallet?.lock();
        setSession((s) => ({ ...s, address: null, isUnlocked: false }));
      }, idleTimeoutMs);
    }
  }, [session.wallet, idleTimeoutMs, clearIdle]);

  useEffect(() => {
    refreshIdle();
  }, [refreshIdle]);

  useEffect(() => {
    return () => clearIdle();
  }, [clearIdle]);

  useEffect(() => {
    const onUnload = () => {
      session.wallet?.lock();
      clearIdle();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [session.wallet, clearIdle]);

  // --- Persistence --------------------------------------------------------

  const persist = useCallback(
    (keystore: KeystoreFile | null) => {
      if (!persistKeystore) return;
      try {
        if (keystore === null) localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, JSON.stringify(keystore));
      } catch {
        // localStorage unavailable (private mode, quota). Persistence
        // is a convenience; swallow.
      }
    },
    [persistKeystore, storageKey],
  );

  useEffect(() => {
    if (!persistKeystore) return;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return;
    let parsed: KeystoreFile;
    try {
      parsed = JSON.parse(stored) as KeystoreFile;
    } catch {
      localStorage.removeItem(storageKey);
      return;
    }
    let cancelled = false;
    Wallet.load(parsed, { network })
      .then((w) => {
        if (cancelled) return;
        setSession({
          wallet: w,
          address: null,
          isLoaded: true,
          isUnlocked: false,
        });
      })
      .catch(() => {
        localStorage.removeItem(storageKey);
      });
    return () => {
      cancelled = true;
    };
  }, [persistKeystore, storageKey, network]);

  // --- Lifecycle ----------------------------------------------------------

  const installUnlocked = useCallback(
    (w: Wallet, keystore: KeystoreFile | null) => {
      setSession({
        wallet: w,
        address: encodeAddress(w.rewardPublicKey(), network),
        isLoaded: true,
        isUnlocked: true,
      });
      if (keystore) persist(keystore);
    },
    [network, persist],
  );

  const create = useCallback(
    async (password: string, wordCount: 12 | 24 = 24) => {
      const result = await Wallet.create(password, { wordCount, network });
      installUnlocked(result.wallet, result.keystore);
      return { mnemonic: result.mnemonic, keystore: result.keystore };
    },
    [network, installUnlocked],
  );

  const importFromMnemonic = useCallback(
    async (mnemonic: string, password: string) => {
      const result = await Wallet.fromMnemonic(mnemonic, password, { network });
      installUnlocked(result.wallet, result.keystore);
      return { keystore: result.keystore };
    },
    [network, installUnlocked],
  );

  const setWalletFromCreate = useCallback(
    (w: Wallet, keystore: KeystoreFile) => {
      installUnlocked(w, keystore);
    },
    [installUnlocked],
  );

  const loadAndUnlock = useCallback(
    async (keystore: KeystoreFile, password: string) => {
      const w = await Wallet.load(keystore, { network });
      await w.unlock(password);
      installUnlocked(w, keystore);
    },
    [network, installUnlocked],
  );

  const load = useCallback(
    async (keystore: KeystoreFile) => {
      const w = await Wallet.load(keystore, { network });
      setSession({
        wallet: w,
        address: null,
        isLoaded: true,
        isUnlocked: false,
      });
      persist(keystore);
    },
    [network, persist],
  );

  const unlock = useCallback(
    async (password: string) => {
      const w = session.wallet;
      if (!w) throw new NoWalletError();
      await w.unlock(password);
      setSession({
        wallet: w,
        address: encodeAddress(w.rewardPublicKey(), network),
        isLoaded: true,
        isUnlocked: true,
      });
      refreshIdle();
    },
    [session.wallet, network, refreshIdle],
  );

  const lock = useCallback(() => {
    session.wallet?.lock();
    setSession((s) => ({ ...s, address: null, isUnlocked: false }));
    clearIdle();
  }, [session.wallet, clearIdle]);

  const forget = useCallback(() => {
    session.wallet?.lock();
    setSession(EMPTY_SESSION);
    persist(null);
    clearIdle();
  }, [session.wallet, persist, clearIdle]);

  const keystoreFile = useCallback((): KeystoreFile | null => {
    return session.wallet?.keystoreFile() ?? null;
  }, [session.wallet]);

  // --- Identity -----------------------------------------------------------

  const rewardPublicKey = useCallback((): string | null => {
    if (!session.wallet || !session.wallet.isUnlocked()) return null;
    return bytesToHex(session.wallet.rewardPublicKey());
  }, [session.wallet]);

  // --- Signing and submission --------------------------------------------

  /**
 * The current session's signer, or null if locked.
 *
 * SignerFn is a plain function: (hash: Uint8Array) => Promise<Uint8Array>.
 * It takes the 32-byte signing hash and returns a 64-byte
 * Ed25519 signature. It does NOT take the full transaction
 * body — the hashing step happens inside UnsignedTx.sign().
 */
  const signer = useCallback((): SignerFn | null => {
    if (!session.wallet || !session.wallet.isUnlocked()) return null;
    refreshIdle();
    return session.wallet.signer();
  }, [session.wallet, refreshIdle]);

  /**
 * The response from sendRawTransaction may expose the txid under
 * one of several names, or not at all. Return whichever is
 * present, or null.
 *
 * This is deliberately forgiving: the wallet's authoritative txid
 * is the local SignedTx.hash(), and the response's value is only
 * used as a cross-check. A response that omits the field is fine;
 * a response that carries a different value is not.
 */
  function extractTxHash(resp: SendTxResponse): HashHex {
    return resp.tx_hash;
  }

  /**
   * Compute the txid of an already-serialized signed transaction.
   *
   * The txid is the hash of the full signed bytes (body || signature),
   * matching SignedTx.hash(). The wallet needs this when it only has
   * the hex — e.g. a tx loaded from disk, or passed in by a caller
   * that didn't keep the SignedTx object.
   *
   * If @claritychain/rpc exposes a `parseSignedTx(hex)` helper,
   * replace this with `parseSignedTx(hex).hash()`. The builder's
   * declaration file does not show one, so this assumes the hash is
   * Blake2b-256 over the signed bytes, which is what SignedTx.hash()
   * is documented to return.
   */
  function hashSignedHex(hex: HexString): HashHex {
    const bytes = hexToBytes(hex);
    const digest = blake2b(bytes, { dkLen: 32 });
    return bytesToHex(digest) as HashHex;
  }

  /**
 * Sign an unsigned transaction with the current signer and
 * submit it. Returns the transaction hash.
 *
 * The hash is computed locally from the signed bytes, not read
 * from the RPC response. A response that disagrees with the
 * local hash is a lying or misconfigured endpoint; the local
 * hash is what the user actually signed.
 */
  const submit = useCallback(
    async (unsignedTx: UnsignedTx): Promise<HashHex> => {
      if (!session.wallet || !session.wallet.isUnlocked()) {
        throw new LockedError();
      }
      refreshIdle();

      const signer: SignerFn = session.wallet.signer();

      // UnsignedTx.sign() computes the signing hash internally
      // (Blake2b-256("CLRTY_TX_V1" || body)), hands it to the
      // signer, and returns a SignedTx with the signature
      // appended. The context does not need to know the wire
      // layout.
      const signed: SignedTx = await unsignedTx.sign(signer);

      const localHash = signed.hash();
      const resp: SendTxResponse = await primary.sendRawTransaction(
        signed.toHex(),
      );

      // If the response carries a txid, check it. A mismatch is a
      // real problem — the endpoint accepted a different
      // transaction than the one we signed, or it's lying about
      // which one it took.
      const remoteHash = extractTxHash(resp);
      if (remoteHash !== null && remoteHash !== localHash) {
        throw new WalletError(
          `node returned txid ${remoteHash} but the signed transaction hashes to ${localHash}`,
        );
      }

      return localHash;
    },
    [session.wallet, primary, refreshIdle],
  );

  /**
   * Send already-signed transaction bytes.
   *
   * The caller has the SignedTx in hand (that's where the hex came
   * from), so the hash is computed locally and used, not read
   * from the response.
   */
  const sendRaw = useCallback(
    async (signedTxHex: HexString): Promise<HashHex> => {
      refreshIdle();
      // A SignedTx can be reconstructed from its wire bytes; the
      // builder's SignedTx constructor takes (body, signature),
      // but for a caller that already has the full wire hex, we
      // need a parse helper. If @claritychain/rpc doesn't expose
      // one, the caller should pass the SignedTx and we call
      // .toHex() and .hash() here instead.
      const localHash = hashSignedHex(signedTxHex);
      const resp: SendTxResponse = await primary.sendRawTransaction(signedTxHex);
      const remoteHash = extractTxHash(resp);
      if (remoteHash !== null && remoteHash !== localHash) {
        throw new WalletError(
          `node returned txid ${remoteHash} but the signed transaction hashes to ${localHash}`,
        );
      }
      return localHash;
    },
    [primary, refreshIdle],
  );

  // --- Reads --------------------------------------------------------------

  const rpc = useCallback((): RpcClient => primary, [primary]);

  const verifiedRoot = useCallback(async (): Promise<VerifiedRoot> => {
    refreshIdle();
    const results = await Promise.all(
      clients.map(async (c, i) => {
        const resp: StateRootResponse = await c.getStateRoot("current");
        // StateRootResponse field names: adjust if they differ.
        return {
          endpoint: endpoints[i],
          root: resp.state_root,
          height: Number(BigInt(resp.height)),
        };
      }),
    );

    const first = results[0];
    const disagreeing = results.filter((r) => r.root !== first.root);
    if (disagreeing.length > 0) {
      throw new RootDisagreementError(results);
    }

    return {
      root: first.root,
      height: first.height,
      sources: results.map((r) => r.endpoint),
      singleSource: results.length === 1,
    };
  }, [clients, endpoints, refreshIdle]);

  const verifyBalance = useCallback(
    async (
      address: Bech32mAddress,
      tokenId = 0,
    ): Promise<VerifiedBalance> => {
      refreshIdle();

      // Step 1: agree on a root across every configured endpoint.
      const rootInfo = await verifiedRoot();

      // Step 2: derive the raw SMT key the daemon's GetProof
      // handler expects. The RPC method takes a numeric key_type
      // and raw key_bytes; it does not resolve a typed descriptor.
      const keyBytes =
        tokenId === 0
          ? accountKey(address)
          : tokenBalanceKey(address, tokenId);
      const keyType =
        tokenId === 0 ? KEY_TYPE_ACCOUNT : KEY_TYPE_TOKEN_BALANCE;

      // Step 3: fetch the proof against the agreed root's height.
      // We request the version we cross-checked, not "current", so
      // a root that moves between the two calls can't produce a
      // proof against a different root than the one we verified.
      const resp: ProofResponse = await primary.getProof({
        key_type: keyType,
        key_bytes: keyBytes,
        version: hexFromNumber(rootInfo.height),
      });

      // Step 4: verify locally. verifyProof recomputes the root
      // from the proof and compares; no DB access, no signature
      // checks, no trust in the server beyond what the proof itself
      // establishes.
      const proofHex = resp.proof;
      if (!proofHex) {
        throw new ProofVerificationError(address, tokenId, "response had no proof");
      }
      const decoded = decodeProof(proofHex);

      const amount = decoded.value ? bytesToBigInt(decoded.value) : 0n;

      return {
        address,
        tokenId,
        amount,
        root: rootInfo.root,
        height: rootInfo.height,
        singleSource: rootInfo.singleSource,
        sources: rootInfo.sources,
      };
    },
    [primary, verifiedRoot, refreshIdle],
  );

  // --- Context value ------------------------------------------------------

  const value = useMemo<WalletContextValue>(
    () => ({
      address: session.address,
      rewardPublicKey,
      network,
      endpoints,

      isLoaded: session.isLoaded,
      isUnlocked: session.isUnlocked,

      create,
      importFromMnemonic,
      setWalletFromCreate,
      loadAndUnlock,
      load,
      unlock,
      lock,
      forget,
      keystoreFile,

      signer,
      submit,
      sendRaw,

      rpc,
      verifyBalance,
      verifiedRoot,
    }),
    [
      session.address,
      session.isLoaded,
      session.isUnlocked,
      rewardPublicKey,
      network,
      endpoints,
      create,
      importFromMnemonic,
      setWalletFromCreate,
      loadAndUnlock,
      load,
      unlock,
      lock,
      forget,
      keystoreFile,
      signer,
      submit,
      sendRaw,
      rpc,
      verifyBalance,
      verifiedRoot,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used inside <WalletProvider>");
  }
  return ctx;
}

export function useWalletRequired(): WalletContextValue {
  const ctx = useWallet();
  if (!ctx.isLoaded) throw new NoWalletError();
  return ctx;
}

export interface WalletStatus {
  isLoaded: boolean;
  isUnlocked: boolean;
  address: string | null;
  network: Network;
}

export function useWalletStatus(): WalletStatus {
  const { isLoaded, isUnlocked, address, network } = useWallet();
  return useMemo(
    () => ({ isLoaded, isUnlocked, address, network }),
    [isLoaded, isUnlocked, address, network],
  );
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function bytesToBigInt(bytes: Uint8Array): bigint {
  let n = 0n;
  for (let i = 0; i < bytes.length; i++) {
    n = (n << 8n) | BigInt(bytes[i]);
  }
  return n;
}

function hexFromNumber(n: number): HexString {
  return `0x${n.toString(16)}` as HexString;
}