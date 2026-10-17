"use client";

import { FC, useState } from "react";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

import { rpc } from "@/lib/rpc";
import { BlockHeader, formatCount, shortAddress, shortHash, timeAgo } from "@claritychain/rpc";
import { useAsync } from "@/lib/hooks";
import { GlassCard } from "../GlassCard";

type Props = {
  pageSize?: number;
};

interface BlocksData {
  blocks: BlockHeader[];
  tip: bigint;
}

const BlocksList: FC<Props> = ({ pageSize = 25 }) => {
  // `start` is the highest height in the current page. `null` means
  // "not yet initialized" — the tip fetch hasn't completed. Once
  // set, paging is driven by it and the tip is only used to clamp
  // the `Newer` button.
  const [start, setStart] = useState<bigint | null>(null);

  // The tip, once fetched, is cached at the module scope. It only
  // advances, so we never need to refetch it on this page — the
  // `Newer` button is bounded by whatever the tip was when the
  // page loaded, which is fine for an explorer list view.
  const state = useAsync<BlocksData>(
    async () => {
      // Fetch the tip if we don't have one yet. On subsequent
      // loads (paging), skip the tip fetch and just fetch the page.
      const tip = START_TIP ?? BigInt((await rpc.blockNumber()).height);
      START_TIP = tip;

      const cursor = start ?? tip;
      const resp = await rpc.getBlocksRange(
        "0x" + cursor.toString(16),
        pageSize,
        "desc",
      );

      return { blocks: resp.blocks, tip };
    },
    [start, pageSize],
    { enabled: start !== null || START_TIP === null ? true : true },
  );

  // Before the first load, `start` is null and the fetcher uses
  // the tip as the cursor. Once it returns, `start` should be
  // initialized to the tip so paging works.
  if (start === null && state.data?.tip !== undefined) {
    setStart(state.data.tip);
  }

  const blocks = state.data?.blocks ?? [];
  const tip = state.data?.tip ?? START_TIP ?? BigInt(0);
  const loading = state.loading && state.data === null;
  const connected = state.data !== null;

  const canPrev = start !== null && start < tip;
  const canNext = start !== null && start > BigInt(0);

  function goPrev() {
    if (start === null) return;
    const next = start + BigInt(pageSize);
    setStart(next > tip ? tip : next);
  }

  function goNext() {
    if (start === null) return;
    const next = start - BigInt(pageSize);
    setStart(next < BigInt(0) ? BigInt(0) : next);
  }

  return (
    <GlassCard>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {start !== null && (
            <>
              Showing blocks{" "}
              <span className="font-mono">
                {formatCount(
                  "0x" +
                  (start < BigInt(pageSize)
                    ? BigInt(0)
                    : start - BigInt(pageSize - 1)
                  ).toString(16),
                )}
              </span>
              {start >= BigInt(0) && (
                <>
                  {" "}
                  through{" "}
                  <span className="font-mono">
                    {formatCount("0x" + start.toString(16))}
                  </span>
                </>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-transparent"
            onClick={goPrev}
            disabled={!canPrev || loading}
          >
            Newer
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-transparent"
            onClick={goNext}
            disabled={!canNext || loading}
          >
            Older
          </Button>
        </div>
      </div>

      {state.error ? (
        <div className="text-sm text-destructive">{state.error}</div>
      ) : loading && blocks.length === 0 ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Height</TableHead>
              <TableHead>Hash</TableHead>
              <TableHead>Producer</TableHead>
              <TableHead className="text-right">TXs</TableHead>
              <TableHead className="text-right">Fees</TableHead>
              <TableHead className="text-right">Age</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {blocks.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  No blocks
                </TableCell>
              </TableRow>
            )}

            {blocks.map((b) => (
              <TableRow key={b.hash}>
                <TableCell>
                  <Link
                    href={`/search/blocks/${BigInt(b.height).toString()}`}
                    className="font-medium hover:underline"
                  >
                    {formatCount(b.height)}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/search/blocks/${BigInt(b.height).toString()}`}
                    className="hover:underline"
                  >
                    {shortHash(b.hash, 10, 8)}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/search/address/${b.proposer}`}
                    className="hover:underline"
                  >
                    {shortAddress(b.proposer)}
                  </Link>
                </TableCell>
                <TableCell className="text-right">{b.tx_count}</TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {formatCount(b.total_fees)}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {timeAgo(b.timestamp_ms)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </GlassCard>
  );
};

/**
 * Module-scoped tip cache. The chain head only advances, and for
 * an explorer list view we don't need to follow it in real time —
 * the `Newer` button is bounded by the tip at page load. Keeping
 * the tip here means paging doesn't refetch it on every click,
 * and the value survives a route transition back to this page.
 */
let START_TIP: bigint | null = null;

export default BlocksList;