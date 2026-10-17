"use client";

import { FC, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  Droplets,
  ArrowUpRight,
} from "lucide-react";
import { usePool, useTokenInfo } from "@/lib/hooks";
import {
  formatTokenAmount,
  reservesForRemoval,
} from "@claritychain/rpc";

/**
 * One row's worth of derived display data. Computed per-position
 * from the pool it points at.
 */
interface PositionRow {
  id: bigint;
  poolId: bigint;
  liquidity: bigint;
}

type props = {
  positions: PositionRow[];
  loading: boolean;
  /** Rows per page. Default 5. */
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 5;

const LiquidityPositions: FC<props> = ({
  positions,
  loading,
  pageSize = DEFAULT_PAGE_SIZE,
}) => {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(positions.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const end = start + pageSize;
  const pageItems = positions.slice(start, end);

  //  Clamp the page when the list shrinks under the current
  //  offset. This runs during render, not in an effect, because
  //  it is a pure derivation of `positions.length` and `page`
  //  and we want the corrected value on the same commit rather
  //  than one paint later.
  if (page > totalPages - 1) {
    setPage(totalPages - 1);
  }

  return (
    <div className="liquid-glass px-6 py-5">
      <div className="lg-blur lg-blur-1" aria-hidden />
      <div className="lg-blur lg-blur-2" aria-hidden />

      <div className="relative z-10">
        <div className="mb-4 flex flex-row items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-medium">
              <Droplets className="h-5 w-5 text-muted-foreground" />
              Liquidity positions
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Your shares in AMM pools.
            </p>
          </div>
          {positions.length > 0 && (
            <Link href="/trade?tab=pool">
              <Button variant="ghost" size="sm">
                View pools
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        {loading && positions.length === 0 && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}

        {!loading && positions.length === 0 && (
          <p className="text-sm text-muted-foreground/50">
            No positions yet.{" "}
            <Link
              href="/trade?tab=pool"
              className="underline underline-offset-4 hover:text-muted-foreground duration-150"
            >
              Add liquidity
            </Link>
            .
          </p>
        )}

        {pageItems.length > 0 && (
          <ul className="space-y-2">
            {pageItems.map((p) => (
              <PositionItem key={p.id.toString()} position={p} />
            ))}
          </ul>
        )}

        {positions.length > pageSize && (
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent"
              onClick={() => setPage((n) => Math.max(0, n - 1))}
              disabled={safePage === 0 || loading}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Newer
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {safePage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent"
              onClick={() => setPage((n) => Math.min(totalPages - 1, n + 1))}
              disabled={safePage >= totalPages - 1 || loading}
            >
              Older
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ================================================================
// Row
// ================================================================

function PositionItem({ position }: { position: PositionRow }) {
  const pool = usePool(position.poolId);
  const tokenA = useTokenInfo(pool.data?.tokenA ?? null);
  const tokenB = useTokenInfo(pool.data?.tokenB ?? null);

  const symbolA =
    tokenA.data?.symbol ?? `#${pool.data?.tokenA.toString() ?? "?"}`;
  const symbolB =
    tokenB.data?.symbol ?? `#${pool.data?.tokenB.toString() ?? "?"}`;

  const decimalsA = tokenDecimals(pool.data?.tokenA, tokenA.data?.decimals);
  const decimalsB = tokenDecimals(pool.data?.tokenB, tokenB.data?.decimals);

  const derived = useMemo(() => {
    const p = pool.data;
    if (!p) return null;
    if (p.totalLiquidity === 0n) return null;

    const shareBps =
      p.totalLiquidity > 0n
        ? Number((position.liquidity * 10_000n) / p.totalLiquidity)
        : 0;

    const { reserveA, reserveB } = reservesForRemoval(
      p,
      position.liquidity,
    );

    return { shareBps, reserveA, reserveB };
  }, [pool.data, position]);

  const loadingPool = pool.loading && !pool.data;

  return (
    <li className="rounded-md border border-white/10 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <Link
              href={`/trade?tab=pool&pool=${position.poolId.toString()}`}
              className="truncate font-medium hover:underline"
            >
              {loadingPool
                ? `Pool #${position.poolId.toString()}`
                : `${symbolA} / ${symbolB}`}
            </Link>
          </div>
          <div className="mt-0.5 font-mono text-xs text-muted-foreground">
            Pool #{position.poolId.toString()}
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <div className="font-medium tabular-nums">
            {formatTokenAmount(position.liquidity, 5)} LP
          </div>
          {derived && (
            <div className="text-xs text-muted-foreground tabular-nums">
              {(derived.shareBps / 100).toFixed(2)}% of pool
            </div>
          )}
        </div>
      </div>

      {derived && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-2 text-xs">
          <div>
            <div className="text-muted-foreground">{symbolA}</div>
            <div className="tabular-nums">
              {formatTokenAmount(derived.reserveA, decimalsA)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">{symbolB}</div>
            <div className="tabular-nums">
              {formatTokenAmount(derived.reserveB, decimalsB)}
            </div>
          </div>
        </div>
      )}

      {derived && (
        <div className="mt-2 text-[10px] text-muted-foreground">
          Redeemable at current reserves. Actual amounts may differ if
          the pool's reserves change before removal.
        </div>
      )}
    </li>
  );
}

// ================================================================
// Helpers
// ================================================================

/**
 * The decimals to use for a token's amounts. The native token is
 * 5 (the pool scale); every other token uses its own record's
 * decimals. The `?? 5` fallback applies only while the record
 * loads.
 */
function tokenDecimals(
  tokenId: bigint | undefined,
  recordDecimals: number | undefined,
): number {
  if (tokenId === 0n) return 5;
  return recordDecimals ?? 5;
}

export default LiquidityPositions;