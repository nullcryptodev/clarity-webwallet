import { Receipt, TransactionWithLocation } from "@claritychain/rpc";

/**
 * Everything the transaction page needs to render, bundled into one
 * object.
 *
 *   - `txWithLocation` is always present.
 *   - `receipt` is present for a confirmed transaction whose receipt
 *     could be fetched.
 *   - `receiptMissing` is `true` when the transaction is confirmed
 *     but the receipt fetch failed. That's an inconsistency in the
 *     node's state (should not happen for a confirmed tx) and worth
 *     surfacing distinctly from "receipt not yet loaded."
 *
 * A pending transaction has `receipt === null` and
 * `receiptMissing === false` — the receipt card is not rendered at
 * all in that case.
 */
export type TransactionBundle = {
  txWithLocation: TransactionWithLocation;
  receipt: Receipt | null;
  receiptMissing: boolean;
};
