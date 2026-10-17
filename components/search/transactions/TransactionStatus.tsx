"use client";

import { FC } from "react";
import Link from "next/link";
import { formatClrty, formatCount, hexToBigInt, humanTypeName, Receipt, shortAddress, TransactionWithLocation } from "@claritychain/rpc";
import { isNativeToken } from "@/lib/utils";
import { DetailRow } from "@/components/DetailRow";
import { GlassCard } from "@/components/GlassCard";

type Props = {
  txWithLocation: TransactionWithLocation;
  receipt: Receipt | null;
};

const TransactionStatus: FC<Props> = ({ txWithLocation, receipt }) => {
  const { tx, status, block_hash, block_height, index } = txWithLocation;
  const isPending = status === "pending";
  const isNative = isNativeToken(tx.token_id);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">{humanTypeName(tx.type)}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <DetailRow label="Type">
          <span>{humanTypeName(tx.type)}</span>
          <span className="text-muted-foreground ml-2 text-xs font-mono">
            (0x{tx.type_code.toString(16)})
          </span>
        </DetailRow>

        <DetailRow label="Status">
          {isPending ? (
            <span className="text-yellow-600 dark:text-yellow-400">
              Pending — in mempool
            </span>
          ) : receipt?.status === "failure" ? (
            <span className="text-destructive">
              Confirmed but failed
            </span>
          ) : (
            <span className="text-green-600 dark:text-green-400">
              Confirmed
            </span>
          )}
        </DetailRow>

        {!isPending && block_height && block_hash && (
          <>
            <DetailRow label="Block">
              <Link
                href={`/search/blocks/${hexToBigInt(block_height)}`}
                className="hover:underline"
              >
                #{formatCount(block_height)}
              </Link>
              <span className="text-muted-foreground ml-2 text-xs">
                (index {index})
              </span>
            </DetailRow>

            <DetailRow label="Block hash" wide>
              <span className="font-mono text-xs break-all">
                {block_hash}
              </span>
            </DetailRow>
          </>
        )}

        <DetailRow label="From">
          <Link
            href={`/search/address/${tx.from}`}
            className="font-mono text-xs hover:underline"
          >
            {shortAddress(tx.from, 12, 8)}
          </Link>
        </DetailRow>

        <DetailRow label="To">
          {tx.to ? (
            <Link
              href={`/search/address/${tx.to}`}
              className="font-mono text-xs hover:underline"
            >
              {shortAddress(tx.to, 12, 8)}
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </DetailRow>

        <DetailRow label="Amount">
          <span>
            {formatClrty(tx.amount)}{" "}
            {isNative ? "CLRTY" : `token ${formatCount(tx.token_id)}`}
          </span>
        </DetailRow>

        <DetailRow label="Fee">
          <span>{formatClrty(tx.fee)} CLRTY</span>
        </DetailRow>

        {receipt && (
          <DetailRow label="Fee paid">
            <span>{formatClrty(receipt.fee_paid)} CLRTY</span>
          </DetailRow>
        )}

        <DetailRow label="Nonce" hint="Sender's sequence number, prevents replay">
          <span className="font-mono">{formatCount(tx.nonce)}</span>
        </DetailRow>

        <DetailRow label="Valid until">
          {hexToBigInt(tx.valid_until_height) === BigInt(0) ? (
            <span className="text-muted-foreground">No expiry</span>
          ) : (
            <Link
              href={`/search/blocks/${hexToBigInt(tx.valid_until_height)}`}
              className="hover:underline"
            >
              Block #{formatCount(tx.valid_until_height)}
            </Link>
          )}
        </DetailRow>

        <DetailRow label="Token ID">
          <Link
            href={`/search/tokens/${isNative ? "0" : BigInt(tx.token_id).toString()}`}
            className="font-mono hover:underline"
          >
            {isNative ? "0x0 (native)" : tx.token_id}
          </Link>
        </DetailRow>

        <DetailRow label="Chain ID">
          <span className="font-mono">{tx.chain_id}</span>
        </DetailRow>

        <DetailRow label="Version">
          <span className="font-mono">{tx.version}</span>
        </DetailRow>
      </div>
    </GlassCard>
  );
};

export default TransactionStatus;