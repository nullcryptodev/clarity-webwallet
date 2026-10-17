"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dex, rpc } from "./rpc";
import {
  DexPosition,
  DexOrder,
  NftCollection,
  CHAIN_ID_MAINNET,
  CHAIN_ID_TESTNET,
  CHAIN_ID_REGTEST,
} from "@claritychain/rpc";
import { useWallet } from "./wallet";
import type { Network } from "@claritychain/wallet";
import { ActivityEntry, toEntry } from "./activity-types";
import { fetchTokenMetadataById } from "./token-metadata";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface AsyncOptions {
  /**
   * Poll interval in milliseconds. Omit for a one-shot fetch.
   * `0` is equivalent to omitting.
   */
  pollMs?: number;
  /**
   * When false, the hook does not fetch at all and returns
   * `{ data: null, loading: false, error: null }`. Use this when
   * the caller knows there is nothing to ask (no wallet address,
   * no node configured) and a fetch would be noise.
   */
  enabled?: boolean;
}

export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  options: AsyncOptions = {},
): AsyncState<T> {
  const { pollMs, enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      // Nothing to ask. Reset to the empty state and skip the
      // network entirely — no initial load, no interval.
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        const result = await fetcherRef.current();
        if (!cancelled) {
          setData(result);
          setError(null);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    };

    setLoading(true);
    load();

    if (pollMs) {
      interval = setInterval(load, pollMs);
    }

    return () => {
      cancelled = true;
      if (interval !== null) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, pollMs, enabled]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, refresh };
}

// ================================================================
// Chain
// ================================================================

export function useChainStats() {
  return useAsync(() => rpc.getChainStats(), []);
}

/**
 * The current chain height.
 *
 * `pollMs` of 0 disables polling after the initial load. Pass
 * `enabled: false` to skip the network entirely — the header uses
 * this when no RPC endpoint is configured, so a landing page on
 * a disconnected deployment never touches the network.
 */
export function useCurrentHeight(
  pollMs = 3000,
  opts: { enabled?: boolean } = {},
) {
  return useAsync(
    async () => {
      const { height } = await rpc.blockNumber();
      return BigInt(height);
    },
    [],
    { pollMs, enabled: opts.enabled ?? true },
  );
}

/**
 * The network the *node* reports, derived from its chain id.
 *
 * This is deliberately separate from `useWallet().network`, which
 * is the network the *app* is configured for. The two should
 * agree; when they don't, the header can surface the mismatch
 * rather than quietly showing the configured value.
 *
 * Returns null if the chain id is not one of the known networks.
 */
export function useNodeNetwork() {
  return useAsync(
    async () => {
      const { chain_id } = await rpc.chainId();
      return networkFromChainId(BigInt(chain_id));
    },
    [],
  );
}

// ================================================================
// Pools
// ================================================================

export function usePools(opts: { limit?: number; offset?: number } = {}) {
  const { limit = 100, offset = 0 } = opts;
  return useAsync(() => dex.getAllPools({ limit, offset }), [limit, offset]);
}

export function usePool(id: bigint | null) {
  return useAsync(
    async () => {
      if (id === null) return null;
      return dex.getPool(id);
    },
    [id?.toString() ?? "null"],
    { enabled: id !== null },
  );
}

export function usePoolsForToken(tokenId: bigint | null) {
  return useAsync(
    async () => {
      if (tokenId === null) return [];
      return dex.getPoolsForToken(tokenId);
    },
    [tokenId?.toString() ?? "null"],
    { enabled: tokenId !== null, pollMs: 15_000 },
  );
}

// ================================================================
// Positions
// ================================================================

export function usePositionByOwner(owner: string | null, poolId: bigint | null) {
  return useAsync(
    async () => {
      if (!owner || poolId === null) return null;
      try {
        return await dex.getPositionByOwner(owner, poolId);
      } catch {
        // Position not found is the common case for a fresh address.
        return null;
      }
    },
    [owner ?? "null", poolId?.toString() ?? "null"],
    { enabled: owner !== null && poolId !== null },
  );
}

// ================================================================
// Tokens
// ================================================================

export function useTokenInfo(tokenId: bigint | null) {
  return useAsync(
    async () => {
      if (tokenId === null) return null;
      try {
        return await rpc.getTokenInfo("0x" + tokenId.toString(16));
      } catch {
        return null;
      }
    },
    [tokenId?.toString() ?? "null"],
    { enabled: tokenId !== null },
  );
}


/**
 * The presentation metadata for a token — description, image,
 * social links, and tags. Sourced from the app's bundled map
 * today; will fetch and hash-verify a remote document once the
 * on-chain fingerprint convention is established.
 *
 * Not polled. Metadata is set at creation time and doesn't
 * change; a one-shot fetch on mount is enough. A caller that
 * knows the metadata changed (a creator just updated theirs)
 * can call `refresh()`.
 *
 * Returns null when the token has no metadata. That's the common
 * case; every caller should render the on-chain `name` and
 * `symbol` regardless.
 */
export function useTokenMetadata(tokenId: bigint | null) {
  return useAsync(
    async () => {
      if (tokenId === null) return null;
      return fetchTokenMetadataById(tokenId);
    },
    [tokenId?.toString() ?? "null"],
    { enabled: tokenId !== null },
  );
}

/**
 * The current tracked supply of a token. Reads through
 * `getTokenSupply`, which returns `{ token_id, supply }`.
 */
export function useTokenSupply(tokenId: bigint | null) {
  return useAsync(
    async () => {
      if (tokenId === null) return null;
      return rpc.getTokenSupply("0x" + tokenId.toString(16));
    },
    [tokenId?.toString() ?? "null"],
    { enabled: tokenId !== null },
  );
}

export function useAllTokens(limit = 100, offset = 0) {
  return useAsync(() => rpc.getAllTokens(limit, offset), [limit, offset]);
}

export function useBalance(address: string | null, tokenId: bigint | null) {
  return useAsync(
    async () => {
      if (!address || tokenId === null) return 0n;
      const { balance } = await rpc.getBalance(
        address,
        "0x" + tokenId.toString(16),
      );
      return BigInt(balance);
    },
    [address ?? "null", tokenId?.toString() ?? "null"],
    { pollMs: 15_000, enabled: address !== null && tokenId !== null },
  );
}

/**
 * The tokens an address has created. Drives the "My tokens" list
 * on the token page — the creator sees the tokens they can mint,
 * burn, and update, which is a different set from the tokens they
 * hold.
 */
export function useTokensByCreator(address: string | null, limit = 100) {
  return useAsync(
    async () => {
      if (!address) return [];
      const resp = await rpc.getTokensByCreator(address, limit);
      return resp.tokens;
    },
    [address ?? "null", limit],
    { enabled: address !== null },
  );
}

/**
 * The holders of a token, paged. Used by the token detail page's
 * "holders" tab. Not polled — holder sets don't move fast enough
 * to justify the traffic.
 */
export function useTokenHolders(tokenId: bigint | null, limit = 100) {
  return useAsync(
    async () => {
      if (tokenId === null) return [];
      const resp = await rpc.getTokenHolders(
        "0x" + tokenId.toString(16),
        limit,
      );
      return resp.holders;
    },
    [tokenId?.toString() ?? "null", limit],
    { enabled: tokenId !== null },
  );
}

/**
 * A token's transfer history, paged. Same reasoning as
 * useTokenHolders — no poll.
 */
export function useTokenTransfers(tokenId: bigint | null, limit = 50) {
  return useAsync(
    async () => {
      if (tokenId === null) return [];
      const resp = await rpc.getTokenTransfers(
        "0x" + tokenId.toString(16),
        limit,
      );
      return resp.transfers;
    },
    [tokenId?.toString() ?? "null", limit],
    { enabled: tokenId !== null },
  );
}

// ================================================================
// NFTs
// ================================================================

export function useNft(nftId: bigint | null) {
  return useAsync(
    async () => {
      if (nftId === null) return null;
      return rpc.getNft("0x" + nftId.toString(16));
    },
    [nftId?.toString() ?? "null"],
    { enabled: nftId !== null },
  );
}

/**
 * The NFTs an address owns. Paged, not polled; ownership changes
 * arrive via the user's own transactions, and the page can
 * `refresh()` after a transfer.
 */
export function useNftsForOwner(
  address: string | null,
  opts: { limit?: number; offset?: number } = {},
) {
  const { limit = 100, offset = 0 } = opts;
  return useAsync(
    async () => {
      if (!address) return [];
      const resp = await rpc.getNftsForOwner(address, limit, offset);
      return resp.nfts;
    },
    [address ?? "null", limit, offset],
    { enabled: address !== null },
  );
}

export function useNftsForCollection(
  collectionId: bigint | null,
  opts: { limit?: number; offset?: number } = {},
) {
  const { limit = 100, offset = 0 } = opts;
  return useAsync(
    async () => {
      if (collectionId === null) return [];
      const resp = await rpc.getNftsForCollection(
        "0x" + collectionId.toString(16),
        limit,
        offset,
      );
      return resp.nfts;
    },
    [collectionId?.toString() ?? "null", limit, offset],
    { enabled: collectionId !== null },
  );
}

export function useCollection(collectionId: bigint | null) {
  return useAsync(
    async () => {
      if (collectionId === null) return null;
      return rpc.getCollection("0x" + collectionId.toString(16));
    },
    [collectionId?.toString() ?? "null"],
    { enabled: collectionId !== null },
  );
}

export function useAllCollections(limit = 100, offset = 0) {
  return useAsync(
    () => rpc.getAllCollections(limit, offset),
    [limit, offset],
  );
}

/**
 * The collections an address has created. Derived client-side
 * from `getAllCollections` filtered by creator, because the RPC
 * surface does not expose a "collections by creator" method.
 *
 * This is O(all collections) per call. Acceptable while the
 * collection count is small; if it ever isn't, add a
 * `getCollectionsByCreator` RPC method rather than paginating
 * the full list on the client.
 */
export function useCollectionsByCreator(address: string | null) {
  return useAsync(
    async () => {
      if (!address) return [];
      // Walk every page until exhausted. The limit is a safety
      // bound, not an expected size.
      const pageSize = 200;
      const maxPages = 20;
      const out: NftCollection[] = [];
      for (let page = 0; page < maxPages; page++) {
        const resp = await rpc.getAllCollections(pageSize, page * pageSize);
        if (resp.collections.length === 0) break;
        for (const c of resp.collections) {
          if (c.creator === address) out.push(c);
        }
        if (resp.collections.length < pageSize) break;
      }
      return out;
    },
    [address ?? "null"],
    { enabled: address !== null },
  );
}

// ================================================================
// Epoch, consensus, fees, staking
// ================================================================

export function useEpochInfo() {
  return useAsync(() => rpc.getEpochInfo(), []);
}

export function useConsensusState() {
  return useAsync(() => rpc.getConsensusState(), []);
}

export function useFeeStats() {
  return useAsync(() => rpc.getFeeStats(), []);
}

export function useStakingInfo() {
  return useAsync(() => rpc.getStakingInfo(), []);
}

// ================================================================
// Validators
// ================================================================

export function useValidators(
  opts: { activeOnly?: boolean; limit?: number; offset?: number } = {},
) {
  const { activeOnly = false, limit = 100, offset = 0 } = opts;
  return useAsync(
    async () => {
      const resp = await rpc.getValidators(activeOnly, limit, offset);
      return resp.validators;
    },
    [activeOnly, limit, offset],
  );
}

export function useValidator(validatorId: bigint | null) {
  return useAsync(
    async () => {
      if (validatorId === null) return null;
      return rpc.getValidator("0x" + validatorId.toString(16));
    },
    [validatorId?.toString() ?? "null"],
    { enabled: validatorId !== null },
  );
}

/**
 * The validator record for the open wallet's address, if any.
 *
 * Reads through `getValidatorByAddress`, which resolves the
 * reward address to a validator id via the validator-by-address
 * index. Returns null when the address is not a validator.
 */
export function useValidatorForAddress(address: string | null) {
  return useAsync(
    async () => {
      if (!address) return null;
      try {
        return await rpc.getValidatorByAddress(address);
      } catch {
        // Not a validator is the common case.
        return null;
      }
    },
    [address ?? "null"],
    { enabled: address !== null, pollMs: 15_000 },
  );
}

export function useValidatorStats(validatorId: bigint | null) {
  return useAsync(
    async () => {
      if (validatorId === null) return null;
      return rpc.getValidatorStats("0x" + validatorId.toString(16));
    },
    [validatorId?.toString() ?? "null"],
    { enabled: validatorId !== null },
  );
}

export function useActiveSet() {
  return useAsync(() => rpc.getActiveSet(), []);
}

// ================================================================
// User data
// ================================================================

export interface UserBalance {
  tokenId: bigint;
  balance: bigint;
  symbol?: string;
  decimals?: number;
}

/**
 * Every token balance held by the open wallet's address. Includes
 * the native CLRTY balance (token id 0) as the first entry.
 *
 * The hook hits `getBalance` for the native token and
 * `getTokensForAddress` for everything else. Those are two RPC
 * calls; the second already includes the native token in its
 * response, so we can actually just use that one. Left in two
 * calls for now for clarity; consolidate once the shape settles.
 */
export interface TokenHolding {
  // Identity
  tokenId: bigint;
  symbol: string | null;
  name: string | null;
  decimals: number | null;
  isNative: boolean;
  creator: string | null;
  backing: "unbacked" | "backed" | "hybrid" | null;
  maxSupply: bigint | null;
  royaltyBps: number | null;

  // Holdings
  balance: bigint;
  /** Native only: the address's staked amount. */
  staked: bigint | null;
  /** Native only: the address's accrued pending rewards. */
  pendingRewards: bigint | null;
  /** Native only: whether the address has opted out of staking. */
  stakingOptedOut: boolean | null;
  /** Sum of remaining_amount across open orders selling this token. */
  lockedInOrders: bigint;
  /** Number of open positions the address holds that include this token. */
  positionCount: number;

  // Valuation (best-effort; null when no pool exists against native)
  clrtyValue: bigint | null;
  /** The pool the valuation was derived from, for linking. */
  valuationPoolId: bigint | null;

  // Provenance
  /** True when this token appears only because the address created it. */
  isCreated: boolean;
}

export interface YourBalances {
  /** Native CLRTY, always present. */
  native: TokenHolding;
  /** Non-native holdings, sorted by CLRTY value descending. */
  tokens: TokenHolding[];
  /** Native first, then `tokens`. Convenience for single iteration. */
  all: TokenHolding[];
}

export function useYourBalances(): AsyncState<YourBalances> {
  const wallet = useWallet();

  return useAsync(
    async () => {
      if (!wallet.address) {
        const n = emptyNative();
        return { native: n, tokens: [], all: [n] };
      }

      // Fetch the account once. It carries the native balance and
      // every staking field, so the native entry is fully populated
      // from this single call.
      const account = await rpc.getAccount(wallet.address);

      // Fetch every token balance the address holds.
      //
      // NOTE: `getTokensForAddress` includes the native token
      // (token_id 0x0) in its response alongside every non-native
      // token. The native entry is constructed separately below
      // from the account record, so skip id 0 here — otherwise it
      // shows up a second time in `tokens`, gets counted in the
      // "Plus N tokens" line, and is summed into the portfolio
      // value on top of the native balance.
      const { tokens: held } = await rpc.getTokensForAddress(wallet.address);

      // Fetch every non-native token the address created. These
      // are shown even when the balance is zero — the creator
      // should see their creations in the list.
      const { tokens: created } = await rpc.getTokensByCreator(
        wallet.address,
        100,
      );

      // Union by token id, excluding the native id. Held takes
      // precedence; created-only entries are marked so the UI can
      // dim them or badge them.
      const byId = new Map<bigint, { balance: bigint; isCreated: boolean }>();
      for (const t of held) {
        const id = BigInt(t.token_id);
        if (id === 0n) continue;
        byId.set(id, { balance: BigInt(t.balance), isCreated: false });
      }
      for (const c of created) {
        const id = BigInt(c.id);
        if (id === 0n) continue;
        if (!byId.has(id)) byId.set(id, { balance: 0n, isCreated: true });
      }

      const ids = [...byId.keys()];

      // Fetch on-chain token info for every non-native id in
      // parallel. Cached by the node; cheap.
      const infos = await Promise.all(
        ids.map(async (id) => {
          try {
            return await rpc.getTokenInfo("0x" + id.toString(16));
          } catch {
            return null;
          }
        }),
      );

      // Fetch the address's open orders once, to compute
      // lockedInOrders per token.
      const ordersResp = await rpc
        .getOrdersForAddress(wallet.address, false)
        .catch(() => ({ orders: [] as any[] }));
      const lockedByToken = new Map<bigint, bigint>();
      for (const o of ordersResp.orders) {
        const sellId = BigInt(o.sell_token);
        const remaining = BigInt(o.remaining_amount ?? "0x0");
        lockedByToken.set(
          sellId,
          (lockedByToken.get(sellId) ?? 0n) + remaining,
        );
      }

      // Fetch the address's positions once, to count how many
      // pools each token participates in.
      const positionsResp = await rpc
        .getPositionsForAddress(wallet.address)
        .catch(() => ({ positions: [] as any[] }));

      // Fetch pools for every non-native token to derive a CLRTY
      // valuation. `getPoolsForToken` returns every pool the token
      // appears in; we pick the one with the deepest native reserve.
      const poolsByToken = new Map<bigint, any[]>();
      await Promise.all(
        ids.map(async (id) => {
          try {
            const { pools } = await rpc.getPoolsForToken(
              "0x" + id.toString(16),
            );
            poolsByToken.set(id, pools);
          } catch {
            poolsByToken.set(id, []);
          }
        }),
      );

      // Count positions per token now that pools are known.
      const positionCountByToken = new Map<bigint, number>();
      for (const p of positionsResp.positions) {
        const pool = findPoolById(poolsByToken, BigInt(p.pool_id));
        if (!pool) continue;
        const a = BigInt(pool.token_a);
        const b = BigInt(pool.token_b);
        if (a !== 0n)
          positionCountByToken.set(a, (positionCountByToken.get(a) ?? 0) + 1);
        if (b !== 0n)
          positionCountByToken.set(b, (positionCountByToken.get(b) ?? 0) + 1);
      }

      // Native entry, fully populated from the account record.
      const native: TokenHolding = {
        tokenId: 0n,
        symbol: "CLRTY",
        name: "Clarity",
        decimals: 5,
        isNative: true,
        creator: null,
        backing: "unbacked",
        maxSupply: null,
        royaltyBps: null,
        balance: BigInt(account.balance),
        staked: BigInt(account.staked),
        pendingRewards: BigInt(account.pending_rewards),
        stakingOptedOut: account.staking_opted_out,
        lockedInOrders: lockedByToken.get(0n) ?? 0n,
        positionCount: positionCountByToken.get(0n) ?? 0,
        clrtyValue: BigInt(account.balance),
        valuationPoolId: null,
        isCreated: false,
      };

      // Non-native entries.
      const tokens: TokenHolding[] = ids.map((id, i) => {
        const info = infos[i];
        const held = byId.get(id)!;
        const pools = poolsByToken.get(id) ?? [];

        // Pick the deepest pool that has native CLRTY on one side.
        let best: {
          pool: any;
          nativeSide: "a" | "b";
          reserve: bigint;
        } | null = null;

        for (const pool of pools) {
          const a = BigInt(pool.token_a);
          const b = BigInt(pool.token_b);
          let nativeSide: "a" | "b" | null = null;
          if (a === 0n) nativeSide = "a";
          else if (b === 0n) nativeSide = "b";
          if (!nativeSide) continue;
          const reserve =
            nativeSide === "a"
              ? BigInt(pool.reserve_a)
              : BigInt(pool.reserve_b);
          if (!best || reserve > best.reserve) {
            best = { pool, nativeSide, reserve };
          }
        }

        let clrtyValue: bigint | null = null;
        let valuationPoolId: bigint | null = null;
        if (best) {
          const otherReserve =
            best.nativeSide === "a"
              ? BigInt(best.pool.reserve_b)
              : BigInt(best.pool.reserve_a);
          if (otherReserve > 0n) {
            clrtyValue = (held.balance * best.reserve) / otherReserve;
          }
          valuationPoolId = BigInt(best.pool.id);
        }

        return {
          tokenId: id,
          symbol: info?.symbol ?? null,
          name: info?.name ?? null,
          decimals: info?.decimals ?? null,
          isNative: false,
          creator: info?.creator ?? null,
          backing: info?.backing ?? null,
          maxSupply: info?.max_supply ? BigInt(info.max_supply) : null,
          royaltyBps: info?.royalty_bps ?? null,
          balance: held.balance,
          staked: null,
          pendingRewards: null,
          stakingOptedOut: null,
          lockedInOrders: lockedByToken.get(id) ?? 0n,
          positionCount: positionCountByToken.get(id) ?? 0,
          clrtyValue,
          valuationPoolId,
          isCreated: held.isCreated,
        } satisfies TokenHolding;
      });

      // Sort by CLRTY value descending; ties broken by symbol for
      // stability across polls.
      tokens.sort((a, b) => {
        const av = a.clrtyValue ?? 0n;
        const bv = b.clrtyValue ?? 0n;
        if (av !== bv) return av > bv ? -1 : 1;
        const as = a.symbol ?? "";
        const bs = b.symbol ?? "";
        return as.localeCompare(bs);
      });

      return { native, tokens, all: [native, ...tokens] };
    },
    [wallet.address ?? "null"],
    { pollMs: 15_000, enabled: wallet.address !== null },
  );
}

function emptyNative(): TokenHolding {
  return {
    tokenId: 0n,
    symbol: "CLRTY",
    name: "Clarity",
    decimals: 5,
    isNative: true,
    creator: null,
    backing: "unbacked",
    maxSupply: null,
    royaltyBps: null,
    balance: 0n,
    staked: 0n,
    pendingRewards: 0n,
    stakingOptedOut: false,
    lockedInOrders: 0n,
    positionCount: 0,
    clrtyValue: 0n,
    valuationPoolId: null,
    isCreated: false,
  };
}

function findPoolById(
  poolsByToken: Map<bigint, any[]>,
  id: bigint,
): any | null {
  for (const pools of poolsByToken.values()) {
    for (const p of pools) {
      if (BigInt(p.id) === id) return p;
    }
  }
  return null;
}

export function useYourPositions(): AsyncState<DexPosition[]> {
  const wallet = useWallet();
  return useAsync(
    async () => {
      if (!wallet.address) return [];
      const { positions } = await rpc.getPositionsForAddress(wallet.address);
      return positions.map((p) => ({
        id: BigInt(p.id),
        owner: p.owner,
        poolId: BigInt(p.pool_id),
        liquidity: BigInt(p.liquidity),
        createdAtHeight: BigInt(p.created_at_height),
        shareBps: p.share_bps,
      }));
    },
    [wallet.address ?? "null"],
    { pollMs: 15_000, enabled: wallet.address !== null },
  );
}

export function useYourOrders(): AsyncState<DexOrder[]> {
  const wallet = useWallet();
  return useAsync(
    async () => {
      if (!wallet.address) return [];
      const { orders } = await rpc.getOrdersForAddress(wallet.address, false);
      return orders.map((o) => ({
        id: BigInt(o.id),
        owner: o.owner,
        mode: o.mode,
        sellToken: BigInt(o.sell_token),
        buyToken: BigInt(o.buy_token),
        sellAmount: BigInt(o.sell_amount),
        minBuyAmount: BigInt(o.min_buy_amount),
        filledAmount: BigInt(o.filled_amount),
        remainingAmount: BigInt(o.remaining_amount),
        createdAtHeight: BigInt(o.created_at_height),
        expiresAtHeight: BigInt(o.order_expires_at_height),
        isFullyFilled: o.is_fully_filled,
        conditions: [],
      }));
    },
    [wallet.address ?? "null"],
    { pollMs: 15_000, enabled: wallet.address !== null },
  );
}

// ================================================================
// Activity
// ================================================================

export function useRecentTransactions(
  limit = 8,
): AsyncState<ActivityEntry[]> {
  return useAsync(
    async () => {
      const result = await rpc.getRecentTransactions(limit);
      // The chain-wide feed has no viewer, so nothing is "in"
      // or "out" relative to a wallet. The empty viewer makes
      // every entry fall into "related", which is the correct
      // label for a row that isn't the viewer's own.
      return result.transactions.map((t) => toEntry("", t));
    },
    [limit],
    { pollMs: 10_000 },
  );
}

/**
 * The open wallet's own transaction history.
 *
 * Every entry is classified against the wallet's own address,
 * which is what makes validator block rewards appear as "in" and
 * the wallet's own sends appear as "out". The classification
 * happens here, in the hook, so callers never see an entry
 * without a direction.
 */
export function useYourTransactions(
  limit = 25,
): AsyncState<ActivityEntry[]> {
  const wallet = useWallet();
  return useAsync(
    async () => {
      const viewer = wallet.address;
      if (!viewer) return [];
      const resp = await rpc.getTransactionsForAddress(viewer, limit);
      return resp.transactions.map((t) => toEntry(viewer, t));
    },
    [wallet.address ?? "null", limit],
    { enabled: wallet.address !== null },
  );
}

// ================================================================
// Helpers
// ================================================================

/**
 * Map a chain id to a network name.
 *
 * The three chain ids are exported by @claritychain/rpc; they are
 * the values the daemon pins at genesis, and the transaction
 * builder stamps them into every signed transaction. Importing
 * them here rather than re-declaring them keeps this function and
 * the builder in lockstep — a drift between the two would produce
 * a badge that says "Mainnet" while the wallet signs testnet
 * transactions, and the node's rejection would not name the cause.
 *
 * Returns null for an unrecognized chain id. That is a real
 * state — a node on a network this build doesn't know about —
 * and the header should show "Unknown" rather than guessing.
 */

const MAINNET_ID = BigInt(CHAIN_ID_MAINNET);
const TESTNET_ID = BigInt(CHAIN_ID_TESTNET);
const REGTEST_ID = BigInt(CHAIN_ID_REGTEST);

function networkFromChainId(chainId: bigint): Network | null {
  if (chainId === MAINNET_ID) return "mainnet";
  if (chainId === TESTNET_ID) return "testnet";
  if (chainId === REGTEST_ID) return "regtest";
  return null;
}

/**
 * The account record for an address. Carries the staking fields
 * (`staked`, `pending_rewards`, `staker_since_height`,
 * `staking_opted_out`) alongside the balance and nonce, so a
 * staking page doesn't need a separate staking hook.
 *
 * Polled at 15 s because the pending-rewards number changes at
 * every epoch boundary and the user is watching it.
 */
export function useAccount(address: string | null) {
  return useAsync(
    async () => {
      if (!address) return null;
      return rpc.getAccount(address);
    },
    [address ?? "null"],
    { pollMs: 15_000, enabled: address !== null },
  );
}

/**
 * The current nonce for an address. Every write operation needs
 * it, and it is always fetched fresh — a cached nonce produces a
 * rejected transaction if the user submits two in quick
 * succession.
 */
export async function currentNonce(address: string): Promise<bigint> {
  const { nonce } = await rpc.getNonce(address);
  return BigInt(nonce);
}