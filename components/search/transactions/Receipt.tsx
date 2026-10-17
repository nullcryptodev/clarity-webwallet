"use client";

import { FC } from "react";
import Link from "next/link";

import { DetailRow } from "@/components/DetailRow";
import { formatClrty, formatCount, hexToBigInt, Receipt } from "@claritychain/rpc";
import { GlassCard } from "../../GlassCard";

type Props = {
  receipt: Receipt | null;
  receiptMissing: boolean;
};

const TransactionReceipt: FC<Props> = ({ receipt, receiptMissing }) => {
  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Receipt</h3>
        {receipt && (
          <span
            className={
              receipt.status === "success"
                ? "text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-mono"
                : "text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-mono"
            }
          >
            {receipt.status === "success" ? "Success" : "Failure"}
          </span>
        )}
      </div>

      {receiptMissing ? (
        <p className="text-sm text-muted-foreground">
          Receipt not available for this transaction. This is unexpected
          for a confirmed transaction and may indicate an index
          inconsistency.
        </p>
      ) : receipt ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <DetailRow label="Status">
            <span
              className={
                receipt.status === "success"
                  ? "text-green-600 dark:text-green-400"
                  : "text-destructive"
              }
            >
              {receipt.status === "success" ? "Success" : "Failure"}
            </span>
          </DetailRow>

          <DetailRow label="Status code">
            <span className="font-mono">{receipt.status_code}</span>
          </DetailRow>

          <DetailRow label="Fee paid">
            <span>{formatClrty(receipt.fee_paid)} CLRTY</span>
          </DetailRow>

          <DetailRow label="Block">
            <Link
              href={`/search/blocks/${hexToBigInt(receipt.block_height)}`}
              className="hover:underline"
            >
              #{formatCount(receipt.block_height)}
            </Link>
          </DetailRow>

          <DetailRow label="Index in block">
            <span className="font-mono">{receipt.index}</span>
          </DetailRow>

          <DetailRow label="Block hash" wide>
            <span className="font-mono text-xs break-all">
              {receipt.block_hash}
            </span>
          </DetailRow>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Loading receipt…</p>
      )}
    </GlassCard>
  );
};

export default TransactionReceipt;