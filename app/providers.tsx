"use client";

import { WalletProvider, type WalletConfig } from "@/lib/wallet";
import type { Network } from "@claritychain/wallet";

/**
 * Read the wallet configuration from the build-time environment.
 *
 * Two things this deliberately does not do:
 *
 *   - It does not fall back to a default endpoint. A deployment
 *     that forgot to set NEXT_PUBLIC_RPC_URLS should fail at
 *     startup, not silently point at localhost and confuse the
 *     operator into thinking the node is down.
 *
 *   - It does not read from window.location or a query string.
 *     The network is a property of the deployment, not of the
 *     visitor; letting it change per-request would mean the
 *     address HRP and the chain ID could disagree with what the
 *     user's keystore was created for.
 */
function readWalletConfig(): WalletConfig {
  const networkRaw = process.env.NEXT_PUBLIC_NETWORK;
  const endpointsRaw = process.env.NEXT_PUBLIC_RPC_URLS;

  if (!networkRaw) {
    throw new Error(
      "NEXT_PUBLIC_NETWORK is not set. " +
      "Expected one of: mainnet, testnet, regtest.",
    );
  }
  const network = parseNetwork(networkRaw);

  if (!endpointsRaw) {
    throw new Error(
      "NEXT_PUBLIC_RPC_URLS is not set. " +
      "Expected a comma-separated list of RPC endpoints, " +
      "e.g. \"https://rpc1.example,rpc2.example\".",
    );
  }
  const endpoints = endpointsRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (endpoints.length === 0) {
    throw new Error(
      "NEXT_PUBLIC_RPC_URLS is set but contains no endpoints.",
    );
  }

  // Validate the URLs early. The RPC client will fail on a bad
  // URL anyway, but the failure will be a fetch error with no
  // indication that the config was the problem.
  for (const url of endpoints) {
    try {
      new URL(url);
    } catch {
      throw new Error(
        `NEXT_PUBLIC_RPC_URLS contains an invalid URL: ${JSON.stringify(url)}`,
      );
    }
  }

  return {
    network,
    endpoints,
    // Persistence on by default. An operator can set
    // NEXT_PUBLIC_PERSIST_KEYSTORE=0 to disable it.
    persistKeystore: process.env.NEXT_PUBLIC_PERSIST_KEYSTORE !== "0",
    // Idle timeout is opt-in via env; the provider's default
    // applies otherwise.
    idleTimeoutMs: parseIdleTimeout(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS),
  };
}

function parseNetwork(raw: string): Network {
  switch (raw) {
    case "mainnet":
    case "testnet":
    case "regtest":
      return raw;
    default:
      throw new Error(
        `NEXT_PUBLIC_NETWORK must be one of mainnet, testnet, regtest; ` +
        `got ${JSON.stringify(raw)}.`,
      );
  }
}

function parseIdleTimeout(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(
      `NEXT_PUBLIC_IDLE_TIMEOUT_MS must be a positive number; ` +
      `got ${JSON.stringify(raw)}.`,
    );
  }
  return n;
}


/**
 * The wallet configuration for this build.
 *
 * Hardcoded to regtest and a single local endpoint for local
 * development. When you deploy this app for real, replace this
 * constant with a read from the environment (see the commented
 * readWalletConfig below) so the same source tree can be built
 * for mainnet, testnet, and regtest without a code change.
 *
 * The endpoint list is intentionally one entry. verifyBalance()
 * will mark proofs as `singleSource: true`, and the wallet UI
 * should surface that to the user — a single-endpoint wallet
 * trusts one server for the state root. Add a second endpoint
 * (a second node, or the same node over a different origin) to
 * get the two-source agreement the landing page describes.
 */
const WALLET_CONFIG: WalletConfig = {
  network: "regtest",
  endpoints: ["http://127.0.0.1:9633"],
  // Persist the keystore to localStorage. Set to false for a
  // session that must not survive a reload.
  persistKeystore: true,
  // Default idle timeout is 15 minutes; leave undefined to use it.
  // idleTimeoutMs: 15 * 60 * 1000,
};

/**
 * The app's provider stack.
 *
 * The wallet config is read once, at module load, and frozen.
 * Every render of <WalletProvider> sees the same config object,
 * so the RPC clients are constructed once per page load rather
 * than once per render — see the useMemo in WalletProvider, which
 * depends on `endpoints.join("|")` for exactly this reason.
 */
//const WALLET_CONFIG: WalletConfig = readWalletConfig();

export function Providers({ children }: { children: React.ReactNode }) {
  return <WalletProvider config={WALLET_CONFIG}>{children}</WalletProvider>;
}