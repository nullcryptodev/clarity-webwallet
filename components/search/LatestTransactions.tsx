"use client"

import { FC } from "react"
import { ArrowLeftRight } from "lucide-react"
import Link from "next/link"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { rpc } from "@/lib/rpc"
import { useAsync } from "@/lib/hooks"
import { GlassCard } from "../GlassCard"
import { formatClrty, humanTypeName, shortAddress, shortHash, timeAgo, Transaction, TxWithLocation } from "@claritychain/rpc"

type TransactionRow = {
  txHash: string
  transactionHash: string
  timeAgo: string
  fromAddress: string
  fromFull: string
  toAddress: string
  toFull: string
  amount: string
  transactionType: string
  pending: boolean
  // Only set for pending rows.
  tier?: "priority" | "standard"
}

type Props = {
  limit?: number
  pollMs?: number
}

interface LatestTransactionsData {
  rows: TransactionRow[]
}

const LatestTransactions: FC<Props> = ({ limit = 10, pollMs = 5000 }) => {
  const state = useAsync<LatestTransactionsData>(
    async () => {
      const rows = await loadTransactions(limit)
      return { rows }
    },
    [limit],
    { pollMs },
  )

  const transactions = state.data?.rows ?? []
  const loading = state.loading && state.data === null

  // `connected` is derived. The RPC error case (unreachable node)
  // sets error and marks offline; the "mempool fetch failed but
  // recent-tx fetch succeeded" case is handled inside
  // loadTransactions by returning partial rows and NOT throwing,
  // so the table still renders what it has.
  const connected = state.data !== null || (state.error !== null && isRpcError(state.error))

  return (
    <GlassCard
      title="Latest Transactions"
      icon={ArrowLeftRight}
    >
      {loading && transactions.length === 0 && (
        <div className="text-sm text-muted-foreground">Loading…</div>
      )}

      {state.error && (
        <div className="text-sm text-destructive">{state.error}</div>
      )}

      {!state.error && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead className="text-center">Amount</TableHead>
              <TableHead className="text-right">Type</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {transactions.length === 0 && !loading && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No transactions yet
                </TableCell>
              </TableRow>
            )}

            {transactions.map((item, idx) => (
              <TableRow key={`${item.txHash}-${idx}`}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {item.pending ? (
                      item.txHash + "(pending)"
                    ) : (
                      <Link
                        href={`/search/transactions/${item.txHash}`}
                        className="text-left font-medium hover:underline"
                      >
                        {item.transactionHash}
                      </Link>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.timeAgo}</span>
                      {item.pending && <PendingBadge tier={item.tier} />}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/search/address/${item.fromFull}`}
                    className="hover:underline"
                  >
                    {item.fromAddress}
                  </Link>
                </TableCell>

                <TableCell className="font-mono text-xs">
                  {item.toFull ? (
                    <Link
                      href={`/search/address/${item.toFull}`}
                      className="hover:underline"
                    >
                      {item.toAddress}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="text-center">{item.amount}</TableCell>

                <TableCell className="text-right">
                  {item.transactionType}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="mt-2 border-t border-white/10 pt-3">
        <Link href="/search/transactions">
          <div className="flex justify-center py-1 text-sm opacity-50 transition-opacity duration-300 hover:opacity-100">
            View all Transactions
          </div>
        </Link>
      </div>
    </GlassCard>
  )
}

// ---------------------------------------------------------------------------
// Data shaping
// ---------------------------------------------------------------------------

async function loadTransactions(limit: number): Promise<TransactionRow[]> {
  // Cap pending rows so a mempool flood doesn't push confirmed
  // activity off the visible page.
  const pendingLimit = Math.min(limit, 5)

  const [confirmedResult, pendingResult] = await Promise.allSettled([
    rpc.getRecentTransactions(limit),
    rpc.getMempoolList(pendingLimit),
  ])

  // Pending rows first. If the mempool fetch fails, fall back to
  // nothing rather than failing the whole table.
  const pendingRows: TransactionRow[] =
    pendingResult.status === "fulfilled"
      ? pendingResult.value.transactions.map(mempoolEntryToRow)
      : []

  // Confirmed rows second. If the RPC fails, the table shows only
  // pending rows (or nothing) rather than a hard error.
  let confirmedRows: TransactionRow[] = []

  if (confirmedResult.status === "fulfilled") {
    const entries = confirmedResult.value.transactions

    // Ensure every referenced block has a cached timestamp. The
    // cache lives at module scope now rather than in a component
    // ref — it's a plain memo table keyed by block height, and its
    // lifetime doesn't need to be tied to a particular mount.
    const heights = new Set<string>()
    for (const entry of entries) heights.add(entry.block_height)

    const missing = [...heights].filter((h) => !BLOCK_TIME_CACHE.has(h))

    if (missing.length > 0) {
      const fetched = await Promise.all(
        missing.map(async (height) => {
          try {
            const header = await rpc.getBlockHeaderByNumber(height)
            return [height, header.timestamp_ms] as const
          } catch {
            return null
          }
        }),
      )
      for (const pair of fetched) {
        if (pair) BLOCK_TIME_CACHE.set(pair[0], pair[1])
      }
    }

    confirmedRows = entries.map((entry) =>
      txWithLocationToRow(entry, BLOCK_TIME_CACHE),
    )
  }

  return [...pendingRows, ...confirmedRows]
}

/**
 * Block-height → timestamp_ms memo. Shared across polls and
 * across component instances, because a block's timestamp never
 * changes once the block is stored. Bounded loosely by the
 * number of distinct blocks the page has seen this session; if
 * it ever needs a cap, prune entries older than the current
 * chain head minus some window.
 */
const BLOCK_TIME_CACHE = new Map<string, string>()

function mempoolEntryToRow(entry: {
  tx: Transaction
  fee_rate: string
  added_ms: string
  size: string
  tier: "priority" | "standard"
}): TransactionRow {
  return {
    txHash: entry.tx.hash,
    transactionHash: shortHash(entry.tx.hash),
    timeAgo: timeAgo(entry.added_ms),
    fromAddress: shortAddress(entry.tx.from),
    fromFull: entry.tx.from,
    toAddress: entry.tx.to ? shortAddress(entry.tx.to) : "—",
    toFull: entry.tx.to ?? "",
    amount: `${formatClrty(entry.tx.amount)} CLRTY`,
    transactionType: humanTypeName(entry.tx.type),
    pending: true,
    tier: entry.tier,
  }
}

function txWithLocationToRow(
  entry: TxWithLocation,
  blockTimes: Map<string, string>,
): TransactionRow {
  const timestamp = blockTimes.get(entry.block_height)
  return {
    txHash: entry.tx.hash,
    transactionHash: shortHash(entry.tx.hash),
    timeAgo: timestamp ? timeAgo(timestamp) : "confirmed",
    fromAddress: shortAddress(entry.tx.from),
    fromFull: entry.tx.from,
    toAddress: entry.tx.to ? shortAddress(entry.tx.to) : "—",
    toFull: entry.tx.to ?? "",
    amount: `${formatClrty(entry.tx.amount)} CLRTY`,
    transactionType: humanTypeName(entry.tx.type),
    pending: false,
  }
}

/**
 * `useAsync` stringifies errors, so the "was it an RPC error or a
 * connection error" distinction from the original component is
 * lost. This is a heuristic: if the string contains a known RPC
 * error marker, treat it as an RPC error. Otherwise it's a
 * connection failure.
 */
function isRpcError(message: string): boolean {
  return message.startsWith("RPC error:") || message.includes("RPC")
}

// ---------------------------------------------------------------------------
// Small UI helpers
// ---------------------------------------------------------------------------

const PendingBadge: FC<{ tier?: "priority" | "standard" }> = ({ tier }) => {
  const label = tier === "priority" ? "Priority" : "Pending"
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-yellow-600 dark:text-yellow-400">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-500" />
      {label}
    </span>
  )
}

export default LatestTransactions