"use client";

import { FC } from "react";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAsync } from "@/lib/hooks";
import { GlassCard } from "../GlassCard";
import { formatClrty, humanTypeName, shortAddress, shortHash, timeAgo, Transaction, TxWithLocation } from "@claritychain/rpc";
import { rpc } from "@/lib/rpc";

type Row = {
  hash: string;
  from: string;
  to: string | null;
  amount: string;
  type: string;
  blockHeight: string | null;
  blockHash: string | null;
  pending: boolean;
  age: string;
};

type Props = {
  limit?: number;
  pollMs?: number;
};

interface TransactionsData {
  rows: Row[];
}

const TransactionsList: FC<Props> = ({ limit = 50, pollMs = 5000 }) => {
  const state = useAsync<TransactionsData>(
    async () => {
      const rows = await loadTransactions(limit);
      return { rows };
    },
    [limit],
    { pollMs },
  );

  const rows = state.data?.rows ?? [];
  const loading = state.loading && state.data === null;
  const connected = state.data !== null || (state.error !== null && isRpcError(state.error));

  return (
    <GlassCard className="lg:mx-auto lg:w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {rows.length} transaction{rows.length === 1 ? "" : "s"}
        </div>
      </div>

      {state.error ? (
        <div className="text-sm text-destructive">{state.error}</div>
      ) : loading && rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hash</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Block</TableHead>
              <TableHead className="text-right">Age</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  No transactions
                </TableCell>
              </TableRow>
            )}

            {rows.map((r, idx) => (
              <TableRow key={`${r.hash}-${idx}`}>
                <TableCell className="font-mono text-xs">
                  {r.pending ? (
                    <span title={`${r.hash} (pending)`}>
                      {shortHash(r.hash, 10, 8)}
                    </span>
                  ) : (
                    <Link
                      href={`/search/transactions/${r.hash}`}
                      className="hover:underline"
                    >
                      {shortHash(r.hash, 10, 8)}
                    </Link>
                  )}
                </TableCell>
                <TableCell className="text-xs">{r.type}</TableCell>
                <TableCell className="font-mono text-xs">
                  <Link href={`/search/address/${r.from}`} className="hover:underline">
                    {shortAddress(r.from)}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {r.to ? (
                    <Link
                      href={`/search/address/${r.to}`}
                      className="hover:underline"
                    >
                      {shortAddress(r.to)}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">{r.amount} CLRTY</TableCell>
                <TableCell className="text-right text-xs">
                  {r.pending ? (
                    <span className="text-yellow-600 dark:text-yellow-400">
                      Pending
                    </span>
                  ) : r.blockHeight ? (
                    <Link
                      href={`/search/blocks/${BigInt(r.blockHeight).toString()}`}
                      className="font-mono hover:underline"
                    >
                      {BigInt(r.blockHeight).toString()}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {r.age}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </GlassCard>
  );
};

// ---------------------------------------------------------------------------
// Data shaping
// ---------------------------------------------------------------------------

async function loadTransactions(limit: number): Promise<Row[]> {
  const [pendingResult, confirmedResult] = await Promise.allSettled([
    rpc.getMempoolList(Math.min(limit, 20)),
    rpc.getRecentTransactions(limit),
  ]);

  // If both calls failed, propagate the failure. If only one
  // failed, return whatever the other returned.
  if (
    pendingResult.status === "rejected" &&
    confirmedResult.status === "rejected"
  ) {
    throw pendingResult.reason;
  }

  const pendingRows: Row[] =
    pendingResult.status === "fulfilled"
      ? pendingResult.value.transactions.map(mempoolEntryToRow)
      : [];

  let confirmedRows: Row[] = [];
  if (confirmedResult.status === "fulfilled") {
    const entries = confirmedResult.value.transactions;

    // Fetch any block timestamps we don't have cached yet.
    const heights = new Set<string>();
    for (const entry of entries) heights.add(entry.block_height);

    const missing = [...heights].filter((h) => !BLOCK_TIME_CACHE.has(h));

    if (missing.length > 0) {
      const fetched = await Promise.all(
        missing.map(async (h) => {
          try {
            const header = await rpc.getBlockHeaderByNumber(h);
            return [h, header.timestamp_ms] as const;
          } catch {
            return null;
          }
        }),
      );
      for (const pair of fetched) {
        if (pair) BLOCK_TIME_CACHE.set(pair[0], pair[1]);
      }
    }

    confirmedRows = entries.map((e) =>
      confirmedTxToRow(e, BLOCK_TIME_CACHE),
    );
  }

  return [...pendingRows, ...confirmedRows];
}

/**
 * Block-height → timestamp_ms memo. Shared across polls and
 * across component instances. A block's timestamp never changes
 * once stored, so there's no reason to refetch it on every
 * render or re-mount.
 */
const BLOCK_TIME_CACHE = new Map<string, string>();

function mempoolEntryToRow(entry: {
  tx: Transaction;
  fee_rate: string;
  added_ms: string;
  size: string;
  tier: "priority" | "standard";
}): Row {
  return {
    hash: entry.tx.hash,
    from: entry.tx.from,
    to: entry.tx.to,
    amount: formatClrty(entry.tx.amount),
    type: humanTypeName(entry.tx.type),
    blockHeight: null,
    blockHash: null,
    pending: true,
    age: timeAgo(entry.added_ms),
  };
}

function confirmedTxToRow(
  entry: TxWithLocation,
  blockTimes: Map<string, string>,
): Row {
  const timestamp = blockTimes.get(entry.block_height);
  return {
    hash: entry.tx.hash,
    from: entry.tx.from,
    to: entry.tx.to,
    amount: formatClrty(entry.tx.amount),
    type: humanTypeName(entry.tx.type),
    blockHeight: entry.block_height,
    blockHash: entry.block_hash,
    pending: false,
    age: timestamp ? timeAgo(timestamp) : "confirmed",
  };
}

/**
 * `useAsync` stringifies errors, so the "was it an RPC error or
 * a connection error" distinction from the original component is
 * lost. This is a heuristic: if the string contains a known RPC
 * error marker, treat it as an RPC error (which means the node
 * responded and the client is reachable); otherwise treat it as
 * a connection failure.
 */
function isRpcError(message: string): boolean {
  return message.startsWith("RPC error:") || message.includes("RPC");
}

export default TransactionsList;