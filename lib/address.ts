// lib/address.ts
//
// Bech32m address encoding and decoding for the CLRTY chain.
//
// Matches the C++ Wallet/AddressCodec.cpp byte-for-byte:
//
//   payload = [witness_version] || pubkey[32]      (33 bytes)
//   address = bech32m(hrp, payload)
//
// The witness version prefix is a single byte, always
// ADDRESS_WITNESS_VERSION, prepended to the 32-byte public key. It
// is what makes the payload 33 bytes and is what the chain's
// decoder validates on the way back in.

export type Network = "mainnet" | "testnet" | "regtest";

export const NETWORK_HRP: Record<Network, string> = {
  mainnet: "clrty",
  testnet: "tclrty",
  regtest: "rclrty",
};

/**
 * The witness version byte that precedes the public key in every
 * CLRTY address payload. Matches ADDRESS_WITNESS_VERSION in the
 * C++ WalletTypes.h.
 */
const ADDRESS_WITNESS_VERSION = 0x00;

/** The public key length, in bytes. */
const ADDRESS_PUBKEY_LENGTH = 32;

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

const CHARSET_MAP: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (let i = 0; i < CHARSET.length; i++) {
    m[CHARSET[i]!] = i;
  }
  return m;
})();

const BECH32M_CONST = 0x2bc830a3;

function polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) {
        chk ^= GEN[i]!;
      }
    }
  }
  return chk;
}

function hrpExpand(hrp: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hrp.length; i++) {
    out.push(hrp.charCodeAt(i) >> 5);
  }
  out.push(0);
  for (let i = 0; i < hrp.length; i++) {
    out.push(hrp.charCodeAt(i) & 31);
  }
  return out;
}

function createChecksum(hrp: string, data: number[]): number[] {
  const values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = polymod(values) ^ BECH32M_CONST;
  const out: number[] = [];
  for (let i = 0; i < 6; i++) {
    out.push((mod >> (5 * (5 - i))) & 31);
  }
  return out;
}

function verifyChecksum(hrp: string, data: number[]): boolean {
  return polymod(hrpExpand(hrp).concat(data)) === BECH32M_CONST;
}

function convertBitsTo5(bytes: Uint8Array): number[] {
  const out: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const b of bytes) {
    acc = (acc << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out.push((acc >> bits) & 31);
    }
  }
  if (bits > 0) {
    out.push((acc << (5 - bits)) & 31);
  }
  return out;
}

function convertBitsTo8(words: number[]): Uint8Array {
  const out: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const w of words) {
    if (w < 0 || w > 31) {
      throw new Error(`invalid 5-bit group: ${w}`);
    }
    acc = (acc << 5) | w;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  if (bits >= 5) {
    throw new Error("malformed 5-bit group padding");
  }
  if ((acc & ((1 << bits) - 1)) !== 0) {
    throw new Error("non-zero padding bits");
  }
  return new Uint8Array(out);
}

/**
 * Build the 33-byte payload: [witness_version, pubkey[32]].
 * Matches the C++ `buildPayload`.
 */
function buildPayload(publicKey: Uint8Array): Uint8Array {
  if (publicKey.length !== ADDRESS_PUBKEY_LENGTH) {
    throw new Error(
      `public key must be ${ADDRESS_PUBKEY_LENGTH} bytes, got ${publicKey.length}`,
    );
  }
  const payload = new Uint8Array(1 + ADDRESS_PUBKEY_LENGTH);
  payload[0] = ADDRESS_WITNESS_VERSION;
  payload.set(publicKey, 1);
  return payload;
}

/**
 * Extract the address from a decoded 33-byte payload. Returns null
 * if the payload is the wrong length, has the wrong witness
 * version, or decodes to the all-zero pubkey.
 *
 * Matches the C++ `addressFromPayload`.
 */
function addressFromPayload(payload: Uint8Array): Uint8Array | null {
  if (payload.length !== 1 + ADDRESS_PUBKEY_LENGTH) return null;
  if (payload[0] !== ADDRESS_WITNESS_VERSION) return null;

  const pubkey = payload.slice(1);
  if (pubkey.every((b) => b === 0)) return null;

  return pubkey;
}

/**
 * Encode a 32-byte public key as a bech32m address for the given
 * network.
 *
 * The address is:
 *
 *   bech32m(hrp, [0x01] || pubkey)
 *
 * which is the same construction the C++ `encodeAddress` produces
 * and the same one the C++ `decodeAddress` accepts.
 */
export function encodeAddress(publicKey: Uint8Array, network: Network): string {
  const hrp = NETWORK_HRP[network];
  const payload = buildPayload(publicKey);
  const data = convertBitsTo5(payload);
  const checksum = createChecksum(hrp, data);
  const combined = data.concat(checksum);
  return hrp + "1" + combined.map((w) => CHARSET[w]).join("");
}

/**
 * Decode a bech32m address to its 32-byte public key.
 *
 * If `network` is provided, the address must use that network's HRP.
 * Throws on a bad checksum, a mixed-case string, a wrong HRP, a
 * wrong witness version, or a body that doesn't decode to 32 bytes
 * of public key after the prefix byte is stripped.
 */
export function decodeAddress(address: string, network?: Network): Uint8Array {
  if (address !== address.toLowerCase() && address !== address.toUpperCase()) {
    throw new Error("address contains mixed case");
  }
  const lower = address.toLowerCase();

  const sep = lower.lastIndexOf("1");
  if (sep < 0) {
    throw new Error("address has no separator");
  }
  if (sep === 0 || sep + 7 > lower.length) {
    throw new Error("address separator in invalid position");
  }

  const hrp = lower.slice(0, sep);
  if (!Object.values(NETWORK_HRP).includes(hrp)) {
    throw new Error(`unknown HRP: ${hrp}`);
  }
  if (network !== undefined && hrp !== NETWORK_HRP[network]) {
    throw new Error(`expected HRP ${NETWORK_HRP[network]}, got ${hrp}`);
  }

  const dataPart = lower.slice(sep + 1);
  const words: number[] = [];
  for (const c of dataPart) {
    const v = CHARSET_MAP[c];
    if (v === undefined) {
      throw new Error(`invalid character: '${c}'`);
    }
    words.push(v);
  }

  if (!verifyChecksum(hrp, words)) {
    throw new Error("invalid checksum");
  }

  const data = words.slice(0, -6);
  const payload = convertBitsTo8(data);
  const pubkey = addressFromPayload(payload);
  if (pubkey === null) {
    throw new Error(
      `payload is not a valid CLRTY address (length ${payload.length}, first byte 0x${payload[0]?.toString(16) ?? "?"})`,
    );
  }
  return pubkey;
}

/**
 * True if the given string is a syntactically valid CLRTY address.
 * Never throws.
 */
export function isValidAddress(address: string, network?: Network): boolean {
  try {
    decodeAddress(address, network);
    return true;
  } catch {
    return false;
  }
}