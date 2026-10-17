"use client";

import { FC, useEffect, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatClrty, humanTypeName, RpcError, shortAddress, shortHash, Transaction } from "@claritychain/rpc";
import { rpc } from "@/lib/rpc";
import { GlassCard } from "../../GlassCard";

type Props = {
  height: string;
};

const BlockTransactions: FC<Props> = ({ height }) => {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const block = await rpc.getBlockByNumber(height, true);
        if (cancelled) return;

        // `getBlockByNumber(full=true)` types transactions as
        // Transaction[] — but the TypeScript union allows a bare
        // array of hashes. Guard against that case.
        const txs = Array.isArray(block.transactions)
          ? (block.transactions as Transaction[])
          : [];

        setTransactions(txs);
      } catch (err) {
        if (cancelled) return;

        if (err instanceof RpcError) {
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
  }, [height]);

  if (loading) {
    return (
      <div className="bg-card border rounded-xl p-4">
        <div className="text-sm text-muted-foreground">
          Loading transactions…
        </div>
      </div>
    );
  }

  if (error || !transactions) {
    return (
      <div className="bg-card border rounded-xl p-4">
        <div className="text-sm text-destructive">
          {error ?? "Could not load transactions"}
        </div>
      </div>
    );
  }

  return (
    <GlassCard>
      <div className="p-4">
        <h2 className="font-medium">
          Transactions{" "}
          <span className="opacity-50">({transactions.length})</span>
        </h2>
      </div>

      <hr />

      <div className="p-4">
        {transactions.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            This block contains no transactions.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hash</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.hash}>
                  <TableCell>
                    <Link
                      href={`/search/transactions/${tx.hash}`}
                      className="font-mono text-xs hover:underline"
                    >
                      {shortHash(tx.hash)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">
                    {humanTypeName(tx.type)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <Link
                      href={`/search/address/${tx.from}`}
                      className="hover:underline"
                    >
                      {shortAddress(tx.from)}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {tx.to ? (
                      <Link
                        href={`/search/address/${tx.to}`}
                        className="hover:underline"
                      >
                        {shortAddress(tx.to)}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatClrty(tx.amount)} CLRTY
                  </TableCell>
                  <TableCell className="text-right">
                    {formatClrty(tx.fee)} CLRTY
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </GlassCard>
  );
};

export default BlockTransactions;