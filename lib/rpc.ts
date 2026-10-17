// Single RpcClient instance for the whole app.
//
// The URL comes from an environment variable so the same build can
// point at mainnet, testnet, or a local regtest node.

import { RpcClient, DexClient } from "@claritychain/rpc";

const DEFAULT_URL = "http://127.0.0.1:9633";

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? DEFAULT_URL;

/**
 * The low-level RPC client. Exposed for callers that need methods
 * the DexClient doesn't wrap yet (chain, consensus, mempool, etc.).
 */
export const rpc = new RpcClient({ url: RPC_URL });

/**
 * The DEX façade. Wraps the AMM and order-book RPC methods with
 * parsed, bigint-typed responses. This is what most components use.
 */
export const dex = new DexClient(rpc);