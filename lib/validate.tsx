import { Account, bigIntToHex, formatClrty, formatTokenAmount, hexToBigInt, VALIDATOR_MIN_STAKE } from "@claritychain/rpc";
import { decodeAddress } from "./address";
import { isAmountable, parseAmount, parseIntegerAmount } from "./utils";
import { TX_CONSTANTS } from "./use-submit-tx";
import { SendAsset } from "@/components/modal/Send/types";


export function validateRecipient(address: string): string | null {
  if (address.length === 0) return null;
  try {
    const decoded = decodeAddress(address);
    if (decoded.length !== 32) {
      return "That address doesn't decode to 32 bytes. Check for a typo.";
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid address.";
  }
}

export function validateMintAmount(
  raw: string,
  token: import("@claritychain/rpc").TokenInfo,
): string | null {
  if (raw.length === 0) return null;
  let n: bigint;
  try {
    const parsed = parseAmount(raw, token.decimals);
    if (parsed === null) return "Invalid amount.";
    n = parsed;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid amount.";
  }
  if (n <= 0n) return "Amount must be greater than zero.";
  return null;
}

export function validateBurnAmount(
  raw: string,
  token: import("@claritychain/rpc").TokenInfo,
  balance: bigint,
): string | null {
  if (raw.length === 0) return null;
  let n: bigint;
  try {
    const parsed = parseAmount(raw, token.decimals);
    if (parsed === null) return "Invalid amount.";
    n = parsed;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid amount.";
  }
  if (n <= 0n) return "Amount must be greater than zero.";
  if (n > balance) {
    return `You only hold ${formatTokenAmount(balance, token.decimals)} ${token.symbol}.`;
  }
  return null;
}

export function validateName(name: string): string | null {
  const t = name.trim();
  if (t.length > 64) return "Name must be 64 characters or fewer.";
  return null;
}

export function validateSymbol(symbol: string): string | null {
  const t = symbol.trim();
  if (t.length < 2) return "Symbol must be at least 2 characters.";
  if (t.length > 8) return "Symbol must be 8 characters or fewer.";
  if (!/^[A-Z0-9]+$/.test(t)) {
    return "Symbol must be uppercase letters and digits only.";
  }
  return null;
}

export function validateMaxSupply(raw: string): string | null {
  if (raw.length === 0) return "Max supply is required for a capped token.";
  try {
    const n = parseIntegerAmount(raw);
    if (n <= 0n) return "Max supply must be greater than zero.";
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid max supply.";
  }
  return null;
}

export function validateDecimals(decimals: string): string | null {
  if (decimals.length === 0) return "Decimals is required.";
  const n = Number(decimals);
  if (!Number.isInteger(n)) return "Decimals must be a whole number.";
  if (n < 0) return "Decimals cannot be negative.";
  if (n > 18) return "Decimals cannot exceed 18.";
  return null;
}

export function validateRoyalty(raw: string): string | null {
  const n = Number(raw);
  if (!Number.isInteger(n)) return "Royalty must be a whole number of bps.";
  if (n < 0) return "Royalty cannot be negative.";
  if (n > 10000) return "Royalty cannot exceed 10000 bps (100%).";
  return null;
}

export function validateNodeKey(hex: string): string | null {
  if (hex.length === 0) return null;
  const trimmed = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (trimmed.length !== 64) {
    return "Node key must be 32 bytes (64 hex characters).";
  }
  if (!/^[0-9a-fA-F]+$/.test(trimmed)) {
    return "Node key must be hex.";
  }
  return null;
}

export function validateStake(
  raw: string,
  account: { balance: string } | null,
): string | null {
  if (raw.length === 0) return null;
  const n = parseAmount(raw, 18);
  if (n === null) return "Invalid amount.";
  if (n < BigInt(VALIDATOR_MIN_STAKE)) {
    return `Minimum stake is ${formatClrty(bigIntToHex(BigInt(VALIDATOR_MIN_STAKE)))} CLRTY.`;
  }
  if (account) {
    const balance = hexToBigInt(account.balance);
    if (n + TX_CONSTANTS.fee > balance) {
      return `Insufficient balance. You have ${formatClrty(bigIntToHex(balance))} CLRTY.`;
    }
  }
  return null;
}

export function validateRewardAddress(address: string): string | null {
  if (address.length === 0) return null;
  try {
    const decoded = decodeAddress(address);
    if (decoded.length !== 32) {
      return "That address doesn't decode to 32 bytes. Check for a typo.";
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid address.";
  }
}

export function validateAmount(
    asset: SendAsset,
    raw: string,
    account: Account | null,
  ): string | null {
  if (!isAmountable(asset)) return null;
  if (raw.length === 0) return null;

  const decimals = asset.kind === "clrty" ? 18 : asset.decimals;

  let parsed: bigint;
  try {
    parsed = parseAmount(raw, decimals)!;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid amount.";
  }
  if (parsed <= 0n) return "Amount must be greater than zero.";

  if (asset.kind === "clrty" && account) {
    const balance = hexToBigInt(account.balance);
    if (parsed + TX_CONSTANTS.fee > balance) {
      return `Insufficient balance. You have ${formatClrty(
        bigIntToHex(balance),
      )} CLRTY, and the fee is ${formatClrty(
        bigIntToHex(TX_CONSTANTS.fee),
      )} CLRTY.`;
    }
  }

  return null;
}
