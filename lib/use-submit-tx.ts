"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { rpc } from "@/lib/rpc";
import type { UnsignedTx } from "@claritychain/rpc";

const DEFAULT_FEE = 1_000n;
const CHAIN_ID = BigInt(0x434c5247); // regtest
const POLL_INTERVAL_MS = 1_000;
const INITIAL_POLL_DELAY_MS = 500;
const WAIT_TIMEOUT_MS = 60_000;

export interface SubmitResult {
  txid: string;
  receipt: {
    status: "success" | "failure";
    feePaid: bigint;
    blockHeight: bigint;
  } | null;
}

export interface UseSubmitTx {
  submit: (unsigned: UnsignedTx, wait?: boolean) => Promise<SubmitResult>;
  submitting: boolean;
  error: string | null;
  clearError: () => void;
  setError: (msg: string | null) => void;
}

/**
 * Build a full transaction pipeline bound to the current wallet.
 *
 * The caller constructs the unsigned transaction with the wallet's
 * address, the current nonce, and the fee. This hook handles the
 * signing, submission, and (optionally) the wait for confirmation.
 */
export function useSubmitTx(): UseSubmitTx {
  const wallet = useWallet();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (unsigned: UnsignedTx, wait = true): Promise<SubmitResult> => {
      setSubmitting(true);
      setError(null);

      try {
        const signer = wallet.signer();
        if (!signer) {
          throw new Error("Wallet is locked. Unlock it and try again.");
        }

        const signed = await unsigned.sign(signer);
        const result = await rpc.sendRawTransaction(signed.toHex());

        const txid = result.tx_hash;

        if (!wait) {
          return { txid, receipt: null };
        }

        const receipt = await pollForReceipt(txid);
        return { txid, receipt };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [wallet],
  );

  const setErrorExternal = useCallback(
    (msg: string | null) => setError(msg),
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    submit, submitting, error, clearError, setError: setErrorExternal
  };
}

/**
 * Poll for a receipt.
 *
 * The node returns "no receipt" for a transaction that is still in
 * the mempool. That's the expected state immediately after
 * submission, so we retry until the timeout instead of propagating.
 *
 * Returns null on timeout rather than throwing, because the
 * transaction may still confirm later and the caller usually wants
 * to show the txid regardless.
 */
async function pollForReceipt(txid: string) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;

  //  Give the node a moment before the first poll. The transaction
  //  is in the mempool at this point; there is no receipt until
  //  it's in a block.
  await sleep(INITIAL_POLL_DELAY_MS);

  for (; ;) {
    try {
      const r = await rpc.getTransactionReceipt(txid);
      return {
        status: r.status,
        feePaid: BigInt(r.fee_paid),
        blockHeight: BigInt(r.block_height),
      };
    } catch (e) {
      //  Pending: the node doesn't have a receipt yet. This is the
      //  normal case while the transaction is in the mempool, and
      //  it's what the entire polling loop exists to retry.
      //
      //  Everything else — connection failures, malformed
      //  responses, anything unexpected — we also retry, on the
      //  theory that a transient error during the confirmation
      //  window shouldn't kill the whole operation. If the node
      //  stays broken for the full timeout, the caller gets the
      //  txid back and can investigate.
      //
      //  The distinction between "pending" and "real error" is
      //  not reliably expressible with the current client, which
      //  throws on both. So we retry everything and only fail on
      //  timeout.
      void e;
    }

    if (Date.now() >= deadline) {
      return null;
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Read the current nonce for the wallet's address. Every write
 * operation needs it, and it's always fetched fresh.
 */
export async function currentNonce(address: string): Promise<bigint> {
  const { nonce } = await rpc.getNonce(address);
  return BigInt(nonce);
}

/** The constants a caller needs to build a transaction. */
export const TX_CONSTANTS = {
  fee: DEFAULT_FEE,
  chainId: CHAIN_ID,
};