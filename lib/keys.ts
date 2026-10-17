import { blake2b } from "@noble/hashes/blake2.js";
import { decodeAddress } from "./address";

// ---------------------------------------------------------------------------
// Domain tags
//
// These MUST match the string literals in State/Keys.h byte for
// byte, including the trailing spaces that pad short tags to four
// bytes. Changing one moves every key in its namespace and makes
// every existing proof against that namespace fail.
// ---------------------------------------------------------------------------

const TAG_ACCOUNT = "acct";
const TAG_TOKEN_BALANCE = "bal ";
const TAG_TOKEN = "tok ";
const TAG_TOKEN_SUPPLY = "tsup";
const TAG_VALIDATOR = "val ";
const TAG_VALIDATOR_BY_ADDRESS = "vadr";
const TAG_ORDER = "ord ";
const TAG_ORDER_EXPIRY = "oexh";
const TAG_GLOBAL = "glob";
const TAG_AMM_POOL = "pool";
const TAG_AMM_POSITION = "pos ";
const TAG_AMM_POSITION_INDEX = "pidx";
const TAG_RECEIPT = "rcpt";
const TAG_ORDER_SEQUENCE = "oseq";
const TAG_VALIDATOR_KEY_HISTORY = "vkey";
const TAG_NFT = "nft ";
const TAG_NFT_COLLECTION = "ncol";
const TAG_NFT_ADDRESS = "nfa ";
const TAG_NFT_COLLECTION_ADDR = "nca ";

// ---------------------------------------------------------------------------
// Key-type tags for the RPC GetProof handler
//
// These are NOT the domain tags above. They are the numeric
// dispatch values the RPC getProof handler switches on, and they
// live in the RPC layer, not in State/Keys.h. They are almost
// certainly the enum order in the daemon's RPC handler; confirm by
// grepping for `key_type` in the RPC source before relying on them.
//
// If they don't match, getProof either returns a proof for the
// wrong key (which verifyProof catches) or rejects the request
// (which the caller sees as an RpcError). Neither is silent in the
// same way a tag mismatch is, but both are worth pinning exactly.
// ---------------------------------------------------------------------------

export const KEY_TYPE_ACCOUNT = 0;
export const KEY_TYPE_TOKEN_BALANCE = 1;
export const KEY_TYPE_TOKEN = 2;
export const KEY_TYPE_VALIDATOR = 3;
export const KEY_TYPE_VALIDATOR_BY_ADDRESS = 4;
export const KEY_TYPE_GLOBAL = 5;
export const KEY_TYPE_AMM_POOL = 6;
export const KEY_TYPE_AMM_POSITION = 7;
export const KEY_TYPE_NFT = 8;
export const KEY_TYPE_NFT_COLLECTION = 9;

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const enc = new TextEncoder();

function be4Tag(s: string): Uint8Array {
  if (s.length !== 4) throw new Error(`domain tag must be 4 chars, got "${s}"`);
  return enc.encode(s);
}

function le32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  b[2] = (n >>> 16) & 0xff;
  b[3] = (n >>> 24) & 0xff;
  return b;
}

function le64(n: bigint): Uint8Array {
  const b = new Uint8Array(8);
  let v = BigInt.asUintN(64, n);
  for (let i = 0; i < 8; i++) {
    b[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return b;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/**
 * Blake2b-256 of (tag || payload).
 *
 * This is the C++ `Crypto::hashDomain(tag, payload, len)` contract
 * as the Keys.h comment describes it ("Blake2b(domain4 || payload)").
 * If Crypto::Helpers implements hashDomain with anything else —
 * a length suffix, a personalization block, a different output
 * length — this helper is the single place to change.
 */
function hashDomain(tag: string, ...payload: Uint8Array[]): Uint8Array {
  return blake2b(concat(be4Tag(tag), ...payload), { dkLen: 32 });
}

function hex(bytes: Uint8Array): `0x${string}` {
  let s = "0x";
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, "0");
  }
  return s as `0x${string}`;
}

/**
 * Raw 32 bytes of a bech32m address.
 *
 * decodeAddress is expected to validate the HRP, the checksum, and
 * the case rules, and to return the 32-byte witness program. If
 * your ./address.ts exposes a different shape (e.g. a
 * `{ version, program }` object), unwrap it here rather than
 * changing every call site.
 */
function addressBytes(address: string): Uint8Array {
  const decoded = decodeAddress(address);
  if (decoded.length !== 32) {
    throw new Error(`address must decode to 32 bytes, got ${decoded.length}`);
  }
  return decoded;
}

// ---------------------------------------------------------------------------
// Account and token
// ---------------------------------------------------------------------------

/** Blake2b("acct" || address). The account record's SMT key. */
export function accountKey(address: string): `0x${string}` {
  return hex(hashDomain(TAG_ACCOUNT, addressBytes(address)));
}

/**
 * Blake2b("bal " || address || LE32(token_id)).
 *
 * Note the tag is "bal " (with a trailing space), not "tbal", and
 * the token id is a 4-byte little-endian u32, not a u64. Both are
 * easy to get wrong and both silently produce a different key.
 */
export function tokenBalanceKey(
  address: string,
  tokenId: number | bigint,
): `0x${string}` {
  const id = Number(BigInt.asUintN(32, BigInt(tokenId)));
  return hex(hashDomain(TAG_TOKEN_BALANCE, addressBytes(address), le32(id)));
}

/** Blake2b("tok " || LE32(token_id)). The token metadata record's key. */
export function tokenKey(tokenId: number | bigint): `0x${string}` {
  const id = Number(BigInt.asUintN(32, BigInt(tokenId)));
  return hex(hashDomain(TAG_TOKEN, le32(id)));
}

/** Blake2b("tsup" || LE32(token_id)). The tracked supply record's key. */
export function tokenSupplyKey(tokenId: number | bigint): `0x${string}` {
  const id = Number(BigInt.asUintN(32, BigInt(tokenId)));
  return hex(hashDomain(TAG_TOKEN_SUPPLY, le32(id)));
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/** Blake2b("val " || LE64(validator_id)). The validator record's key. */
export function validatorKey(validatorId: number | bigint): `0x${string}` {
  return hex(hashDomain(TAG_VALIDATOR, le64(BigInt(validatorId))));
}

/**
 * Blake2b("vadr" || address).
 *
 * The validator-by-address index key. The address here is the
 * validator's reward address, not its consensus key — the index
 * is what maps a bech32m reward address to a validator id, and
 * the README's "registration writes a validator-by-address index
 * entry that maps the reward address to the validator ID" is
 * exactly this row.
 */
export function validatorByAddressKey(address: string): `0x${string}` {
  return hex(hashDomain(TAG_VALIDATOR_BY_ADDRESS, addressBytes(address)));
}

/**
 * Blake2b("vkey" || LE64(validator_id)).
 *
 * The consensus-key history's SMT key. The README describes the
 * history as a "companion key" sibling to Keys::validator; this
 * is the sibling.
 */
export function validatorKeyHistoryKey(
  validatorId: number | bigint,
): `0x${string}` {
  return hex(hashDomain(TAG_VALIDATOR_KEY_HISTORY, le64(BigInt(validatorId))));
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/** Blake2b("ord " || LE64(order_id)). */
export function orderKey(orderId: number | bigint): `0x${string}` {
  return hex(hashDomain(TAG_ORDER, le64(BigInt(orderId))));
}

/** Blake2b("oexh" || LE64(height)). The per-height expiry index key. */
export function orderExpiryKey(height: number | bigint): `0x${string}` {
  return hex(hashDomain(TAG_ORDER_EXPIRY, le64(BigInt(height))));
}

/**
 * Blake2b("oseq" || LE64(order_id)).
 *
 * The per-order sequence companion. The README's
 * `order:next_sequence` global is a different key (a global, not a
 * per-order sequence), and is reached through the global
 * derivation below, not this one.
 */
export function orderSequenceKey(orderId: number | bigint): `0x${string}` {
  return hex(hashDomain(TAG_ORDER_SEQUENCE, le64(BigInt(orderId))));
}

// ---------------------------------------------------------------------------
// AMM
// ---------------------------------------------------------------------------

/** Blake2b("pool" || LE64(pool_id)). */
export function ammPoolKey(poolId: number | bigint): `0x${string}` {
  return hex(hashDomain(TAG_AMM_POOL, le64(BigInt(poolId))));
}

/** Blake2b("pos " || LE64(position_id)). */
export function ammPositionKey(positionId: number | bigint): `0x${string}` {
  return hex(hashDomain(TAG_AMM_POSITION, le64(BigInt(positionId))));
}

/**
 * Blake2b("pidx" || owner || LE64(pool_id)).
 *
 * The owner-by-pool position index. Note the payload is
 * address-then-pool-id, not pool-id-then-address.
 */
export function ammPositionIndexKey(
  owner: string,
  poolId: number | bigint,
): `0x${string}` {
  return hex(
    hashDomain(TAG_AMM_POSITION_INDEX, addressBytes(owner), le64(BigInt(poolId))),
  );
}

// ---------------------------------------------------------------------------
// Receipts and globals
// ---------------------------------------------------------------------------

/** Blake2b("rcpt" || tx_hash). The receipt record's key. */
export function receiptKey(txHash: `0x${string}` | Uint8Array): `0x${string}` {
  const bytes =
    typeof txHash === "string" ? hexToBytes(txHash) : txHash;
  if (bytes.length !== 32) {
    throw new Error(`tx hash must be 32 bytes, got ${bytes.length}`);
  }
  return hex(hashDomain(TAG_RECEIPT, bytes));
}

/**
 * Blake2b("glob" || name[0..min(len, 64)]).
 *
 * The C++ side truncates the name to 64 bytes before hashing. A
 * caller that passes a name longer than 64 bytes gets a key for
 * the first 64 bytes, not an error. The truncation is silent on
 * both sides, so if a global's name ever grows past 64 bytes, the
 * key moves. Keep names short.
 */
export function globalKey(name: string): `0x${string}` {
  const bytes = enc.encode(name).slice(0, 64);
  return hex(hashDomain(TAG_GLOBAL, bytes));
}

// ---------------------------------------------------------------------------
// NFTs
// ---------------------------------------------------------------------------

/** Blake2b("nft " || LE64(nft_id)). The NftInfo record's key. */
export function nftKey(nftId: number | bigint): `0x${string}` {
  return hex(hashDomain(TAG_NFT, le64(BigInt(nftId))));
}

/** Blake2b("ncol" || LE64(collection_id)). The NftCollection record's key. */
export function nftCollectionKey(
  collectionId: number | bigint,
): `0x${string}` {
  return hex(hashDomain(TAG_NFT_COLLECTION, le64(BigInt(collectionId))));
}

/**
 * Blake2b("nfa " || LE64(nft_id)).
 *
 * Note: this is a raw Blake2b over the concatenation, NOT a
 * hashDomain call. The C++ side builds a 12-byte buffer and
 * blake2b's it directly. If Crypto::hashDomain and Crypto::blake2b
 * differ in any way, this function and nftAddress() must follow
 * Crypto::blake2b, not hashDomain.
 *
 * Returns raw 32 bytes. The result is a *virtual address* — the
 * same 32-byte space as a real Ed25519 public key — so it can be
 * bech32m-encoded and used as an address anywhere a balance is
 * read.
 */
export function nftAddressBytes(nftId: number | bigint): Uint8Array {
  return blake2b(
    concat(be4Tag(TAG_NFT_ADDRESS), le64(BigInt(nftId))),
    { dkLen: 32 },
  );
}

/**
 * Blake2b("nca " || LE64(collection_id)).
 *
 * The collection's virtual custody address. Same raw-Blake2b
 * caveat as nftAddressBytes.
 */
export function nftCollectionAddressBytes(
  collectionId: number | bigint,
): Uint8Array {
  return blake2b(
    concat(be4Tag(TAG_NFT_COLLECTION_ADDR), le64(BigInt(collectionId))),
    { dkLen: 32 },
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function hexToBytes(h: string): Uint8Array {
  const s = h.startsWith("0x") ? h.slice(2) : h;
  if (s.length % 2 !== 0) throw new Error("hex string has odd length");
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}