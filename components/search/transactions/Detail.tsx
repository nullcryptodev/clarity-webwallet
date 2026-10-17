"use client";

import { FC, useEffect, useState } from "react";

import { rpc } from "@/lib/rpc";
import { RpcError } from "@claritychain/rpc";
import { TransactionBundle } from "../types";
import TransactionHeader from "./Header";
import TransactionStatus from "./TransactionStatus";
import TransactionReceipt from "./Receipt";
import TransactionPayload from "./Payload";
import TransactionRaw from "./Raw";

type Props = {
  hash: string;
};

const TransactionDetail: FC<Props> = ({ hash }) => {
  const [bundle, setBundle] = useState<TransactionBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const txWithLocation = await rpc.getTransactionByHash(hash);
        if (cancelled) return;

        //  Receipt fetch is only meaningful for a confirmed tx. If
        //  the tx is confirmed but the receipt is missing, that's a
        //  real inconsistency (the receipt should have been written
        //  in the same txn as the tx index) and gets its own flag,
        //  distinct from "not yet loaded."
        let receipt = null;
        let receiptMissing = false;

        if (txWithLocation.status === "confirmed") {
          try {
            receipt = await rpc.getTransactionReceipt(hash);
          } catch {
            receiptMissing = true;
          }
        }

        if (cancelled) return;

        setBundle({ txWithLocation, receipt, receiptMissing });
      } catch (err) {
        if (cancelled) return;

        if (err instanceof RpcError) {
          if (err.code === -32002) {
            // TransactionNotFound
            setError("Transaction not found");
          } else {
            setError(err.message);
          }
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Could not reach the node");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [hash]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-card border rounded-xl p-4">
          <div className="text-sm text-muted-foreground">
            Loading transaction…
          </div>
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-card border rounded-xl p-4">
          <div className="text-sm text-destructive">
            {error ?? "Transaction not found"}
          </div>
        </div>
      </div>
    );
  }

  const { txWithLocation, receipt, receiptMissing } = bundle;
  const { tx, status } = txWithLocation;
  const isPending = status === "pending";

  return (
    <div className="flex flex-col gap-4">
      <TransactionHeader
        hash={hash}
        pending={isPending}
        receipt={receipt}
      />

      <TransactionStatus txWithLocation={txWithLocation} receipt={receipt} />

      {!isPending && (
        <TransactionReceipt receipt={receipt} receiptMissing={receiptMissing} />
      )}

      {tx.payload && tx.payload !== "0x" && (
        <TransactionPayload payload={tx.payload} payloadSize={tx.payload_size} />
      )}

      <TransactionRaw bundle={txWithLocation} />
    </div>
  );
};

export default TransactionDetail;