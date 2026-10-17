import type { TokenInfo } from "@claritychain/rpc";

/**
 * The presentation data for a token. All fields are optional;
 * a token with no metadata still renders (its name and symbol
 * come from the on-chain record).
 *
 * The shape mirrors ERC-20 and ERC-721 metadata conventions so
 * a wallet that already knows how to render those knows how to
 * render this.
 */
export interface TokenMetadata {
  /** A paragraph or two. Shown on the token detail page. */
  description?: string;
  /** A URL, an IPFS path, or a bundled asset path. */
  image?: string;
  /** A URL for the token's website. */
  external_url?: string;
  /** Social links, keyed by platform name. */
  socials?: Record<string, string>;
  /** Free-form tags for filtering and search. */
  tags?: string[];
}

/**
 * The bundled metadata for tokens the app ships with.
 *
 * A token that isn't here still works — its on-chain name and
 * symbol render, and the description and image are simply
 * absent. This map is a *supplement* to the on-chain record,
 * not a replacement.
 *
 * Keys are the token id in decimal string form, matching the
 * shape of the id elsewhere (`0x0` and `0x1` also work; the
 * lookup normalizes).
 * 
 * image name should be coinname-cointicker
 * no more than 3 tags!
 */
const BUNDLED_METADATA: Record<string, TokenMetadata> = {
  "0": {
    description:
      "The native asset of the Clarity chain. Used for transaction fees, staking, and validator rewards.",
    image: "tokens/clarity-clrty.png",
    tags: ["native"],
  },
  "1": {
    description:
      "Example Chain (EX1) is a test token on the regtest network, used to exercise the DEX and AMM flows end to end.",
    image: "/tokens/example-ex1.png",
    tags: ["test", "regtest"],
  },
};

/**
 * Normalize a token id to the decimal string form the bundled
 * map uses as its key. Accepts `0x`-prefixed hex, plain decimal
 * strings, and `bigint`s.
 */
function normalizeTokenId(id: string | bigint): string {
  if (typeof id === "bigint") return id.toString();
  const trimmed = id.trim().toLowerCase();
  if (trimmed.startsWith("0x")) {
    return BigInt(trimmed).toString();
  }
  return BigInt(trimmed).toString();
}

/**
 * Fetch the metadata for a token, if the app knows any.
 *
 * The function is async today even though the bundled map is
 * synchronous. That's deliberate: when the app moves to
 * fingerprint-verified remote metadata, the body of this
 * function gains a `fetch` and a hash comparison, and every
 * caller keeps working without changes.
 *
 * Returns null when there is no metadata for the token. That's
 * the common case for tokens the app hasn't been told about;
 * callers render the on-chain name and symbol regardless.
 */
export async function fetchTokenMetadata(
  token: TokenInfo,
): Promise<TokenMetadata | null> {
  const key = normalizeTokenId(token.id);
  return BUNDLED_METADATA[key] ?? null;
}

/**
 * The metadata for a token whose TokenInfo may not be loaded yet.
 * Same contract as `fetchTokenMetadata`, but skips the fetch
 * when the caller doesn't have the record. Useful for the token
 * picker, where the id is known but the record is still loading.
 */
export async function fetchTokenMetadataById(
  tokenId: bigint,
): Promise<TokenMetadata | null> {
  const key = tokenId.toString();
  return BUNDLED_METADATA[key] ?? null;
}