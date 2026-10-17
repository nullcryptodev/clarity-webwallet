"use client"

import { FC } from "react"
import { Blocks } from "lucide-react"
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
import { REWARD_SPLIT } from "@/lib/rewards"
import RewardBar from "@/components/RewardBar"
import { useAsync } from "@/lib/hooks"
import { GlassCard } from "@/components/GlassCard"
import { bigIntToHex, BlockHeader, formatClrty, formatCount, hexToBigInt, shortAddress, timeAgo } from "@claritychain/rpc"

type BlockRow = {
  heightHex: string
  heightNumber: string
  blockHash: string

  blockHeight: string
  timeAgo: string
  producerAddress: string
  producerFull: string
  totalTransactions: string
  blockReward: string
  validatorShare: string
  stakerShare: string
  potShare: string
  /** Whether the split shown is the seed-only variant. */
  seedOnly: boolean
}

type Props = {
  limit?: number
  pollMs?: number
}

interface LatestBlocksData {
  blocks: BlockRow[]
}

const LatestBlocks: FC<Props> = ({ limit = 10, pollMs = 5000 }) => {
  const state = useAsync<LatestBlocksData>(
    async () => {
      // The two fetches are independent and both are needed
      // before any row can be built. Running them in parallel
      // halves the wall-clock latency of a poll, and lets us use
      // the freshly-returned `isSeedOnly` directly in
      // `headerToRow` rather than reading it back out of React
      // state (which would be stale on the first tick and require
      // an extra render to fix).
      const [recent, isSeedOnly] = await Promise.all([
        rpc.getRecentBlocks(limit),
        fetchSeedOnly(),
      ])

      return {
        blocks: recent.blocks.map((h) => headerToRow(h, isSeedOnly)),
      }
    },
    [limit],
    { pollMs },
  )

  const blocks = state.data?.blocks ?? []
  const loading = state.loading && state.data === null

  // `connected` is derived rather than stored: a successful load
  // means data is present and no error is set. The hook clears
  // `error` on every successful fetch, so this tracks the same
  // thing the manual state machine did.
  //
  // The `null` case (never fetched yet) is what keeps the badge
  // from flashing "Offline" before the first request completes.
  const connected: boolean | null =
    state.data !== null ? true : state.error !== null ? false : null

  return (
    <GlassCard
      title="Latest Blocks"
      icon={Blocks}
    >
      {state.error ? (
        <div className="text-sm text-destructive">{state.error}</div>
      ) : loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Block</TableHead>
              <TableHead>Producer</TableHead>
              <TableHead className="text-right">TXs</TableHead>
              <TableHead className="text-right">Block Reward</TableHead>
              <TableHead className="text-center">Reward Split</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {blocks.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No blocks yet
                </TableCell>
              </TableRow>
            )}

            {blocks.map((item) => (
              <TableRow key={item.heightHex}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/search/blocks/${item.heightNumber}`}
                      className="text-left font-medium hover:underline"
                    >
                      {item.blockHeight}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {item.timeAgo}
                    </span>
                  </div>
                </TableCell>

                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/search/address/${item.producerFull}`}
                    className="hover:underline"
                  >
                    {item.producerAddress}
                  </Link>
                </TableCell>

                <TableCell className="text-right">
                  {item.totalTransactions}
                </TableCell>

                <TableCell className="text-right">
                  {item.blockReward} CLRTY
                </TableCell>

                <TableCell className="text-right">
                  <RewardBar
                    validatorShare={item.validatorShare}
                    stakerShare={item.stakerShare}
                    potShare={item.potShare}
                    seedOnly={item.seedOnly}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="mt-2 border-t border-white/10 pt-3">
        <Link href="/search/blocks">
          <div className="flex justify-center py-1 text-sm opacity-50 transition-opacity duration-300 hover:opacity-100">
            View all Blocks
          </div>
        </Link>
      </div>
    </GlassCard>
  )
}

// Data shaping

function headerToRow(header: BlockHeader, seedOnly: boolean): BlockRow {
  const total = bigIntToHex(REWARD_SPLIT.total)

  // The producer bonus and set share are the same number in both
  // the nominal and seed-only cases — only the destination of the
  // set share changes (validators vs. pot). So the "validator"
  // segment is always producerBonus, and the other two segments
  // swap depending on whether we're in seed-only mode.
  const producer = bigIntToHex(REWARD_SPLIT.producerBonus)
  const staker = bigIntToHex(REWARD_SPLIT.stakerPool)

  // Seed-only: set share routes to the pot, so the pot segment is
  // stakerPool + setShare. Non-seed-only: stakerPool stays with
  // stakers, setShare goes to validators as part of their share.
  const pot = seedOnly
    ? bigIntToHex(REWARD_SPLIT.stakerPool + REWARD_SPLIT.setShare)
    : bigIntToHex(REWARD_SPLIT.setShare)

  // In seed-only mode there are no stakers yet (the chain is too
  // young for anyone to have opted in), so the staker segment is
  // zero. In normal mode, stakerPool goes to stakers.
  const stakerSegment = seedOnly ? "0" : formatClrty(staker)

  return {
    heightHex: header.height,
    heightNumber: hexToBigInt(header.height).toString(),
    blockHash: header.hash,

    blockHeight: formatCount(header.height),
    timeAgo: timeAgo(header.timestamp_ms),
    producerAddress: shortAddress(header.proposer),
    producerFull: header.proposer,
    totalTransactions: header.tx_count.toString(),
    blockReward: formatClrty(total),
    validatorShare: formatClrty(producer),
    stakerShare: stakerSegment,
    potShare: formatClrty(pot),
    seedOnly,
  }
}

// Detects whether the current active set is entirely seed
// validators. If either lookup fails, falls back to "not
// seed-only," which renders the nominal split. A wrong label is
// better than failing the whole table.
async function fetchSeedOnly(): Promise<boolean> {
  try {
    const activeSet = await rpc.getActiveSet()
    if (activeSet.ids.length === 0) return false

    // getValidators(activeOnly=true) returns the records for the
    // current active set, each carrying an is_seed flag.
    const resp = await rpc.getValidators(true)
    if (resp.validators.length === 0) return false

    return resp.validators.every((v) => v.is_seed)
  } catch {
    return false
  }
}

export default LatestBlocks