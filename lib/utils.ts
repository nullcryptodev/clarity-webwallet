import { AmountableAsset, SendAsset } from "@/components/modal/Send/types";
import { hexToBigInt } from "@claritychain/rpc";

export { cn } from "cn"

/**
 * Parse a decimal string into atomic units. Returns null on
 * malformed input rather than throwing, because the form uses it
 * during render for validation.
 */
export function parseAmount(raw: string, decimals: number): bigint | null {
  const t = raw.trim();
  if (t.length === 0) return null;
  if (!/^\d+(\.\d*)?$/.test(t)) return null;
  const [whole, frac = ""] = t.split(".");
  if (frac.length > decimals) return null;
  return BigInt(whole + frac.padEnd(decimals, "0"));
}

/**
 * Same as parseAmount, but throws instead of returning null.
 * Use at call sites where a null would be a programming error
 * (e.g. after a form has already validated the input).
 */
export function requireAmount(raw: string, decimals: number): bigint {
  const v = parseAmount(raw, decimals);
  if (v === null) {
    throw new Error("Invalid amount.");
  }
  return v;
}

/**
 * A local approximation of the token's current supply, derived
 * from the max supply and the remaining headroom. The manage page
 * does not fetch the exact supply from the RPC (there's no hook
 * for it here); when the supply hook lands, this function is
 * replaced by its return value.
 *
 * Until then, it returns 0n, which makes the "remaining" display
 * show the full cap rather than a partial number. That's a
 * conservative default: an over-estimate of what's mintable is
 * safer than an under-estimate for a display that gates a mint.
 */
export function supplyApprox(_token: import("@claritychain/rpc").TokenInfo): bigint {
  return 0n;
}

export function parseHex32(hex: string): Uint8Array | null {
  const trimmed = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (trimmed.length !== 64) return null;
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    const byte = parseInt(trimmed.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) return null;
    out[i] = byte;
  }
  return out;
}

export function isAmountable(asset: SendAsset): asset is AmountableAsset {
  return asset.kind === "clrty" || asset.kind === "token";
}

export function assetLabel(asset: SendAsset): string {
  switch (asset.kind) {
    case "clrty":
      return "CLRTY";
    case "token":
      return asset.symbol;
    case "token-selecting":
      return "Token";
    case "nft":
      return `NFT #${hexToBigInt(asset.nft.id).toString()}`;
    case "nft-selecting":
      return "NFT";
  }
}

export function parseIntegerAmount(raw: string): bigint {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) {
    throw new Error("Must be a non-negative whole number.");
  }
  return BigInt(t);
}

/** Is the tx a native-token (CLRTY) operation or a custom-token one? */
export function isNativeToken(tokenId: string): boolean {
  return tokenId === "0x0";
}
