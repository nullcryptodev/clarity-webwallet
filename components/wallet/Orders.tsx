"use client";

import { FC, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  LineChart as LineChartIcon,
} from "lucide-react";
import { useTokenInfo } from "@/lib/hooks";
import { formatTokenAmount } from "@claritychain/rpc";
import type { DexOrder } from "@claritychain/rpc";

type props = {
  orders: DexOrder[];
  loading: boolean;
  /** Rows per page. Default 5. */
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 5;

const Orders: FC<props> = ({
  orders,
  loading,
  pageSize = DEFAULT_PAGE_SIZE,
}) => {
  //  Only orders that still have something left to fill. A
  //  fully-filled order is finished; it's history, not a
  //  resting order.
  const open = useMemo(
    () => orders.filter((o) => o.remainingAmount > 0n),
    [orders],
  );

  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(open.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const end = start + pageSize;
  const pageItems = open.slice(start, end);

  //  Clamp the page when the list shrinks under the current
  //  offset. Runs during render, not in an effect, because it's
  //  a pure derivation of `open.length` and `page` and we want
  //  the corrected value on the same commit rather than one
  //  paint later.
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
              <LineChartIcon className="h-5 w-5 text-muted-foreground" />
              Open orders
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Passive and Active orders still resting.
            </p>
          </div>
          {open.length > 0 && (
            <Link href="/trade?tab=limit">
              <Button variant="ghost" size="sm">
                View all
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        {loading && open.length === 0 && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}

        {!loading && open.length === 0 && (
          <p className="text-sm text-muted-foreground/50">
            No open orders.{" "}
            <Link
              href="/trade?tab=limit"
              className="underline underline-offset-4 hover:text-muted-foreground duration-150"
            >
              Place one
            </Link>
            .
          </p>
        )}

        {pageItems.length > 0 && (
          <ul className="space-y-2">
            {pageItems.map((o) => (
              <OrderItem key={o.id.toString()} order={o} />
            ))}
          </ul>
        )}

        {open.length > pageSize && (
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent"
              onClick={() => setPage((n) => Math.max(0, n - 1))}
              disabled={safePage === 0 || loading}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
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
              Next
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

/**
 * One open order. Resolves the two tokens' symbols and decimals
 * via hooks, then renders the pair, the mode, the remaining
 * amount, the limit price, and the expiry.
 *
 * The limit price is `minBuyAmount / sellAmount` — the ratio the
 * order is willing to trade at, expressed in the order's own
 * direction. It's the number that answers "at what price is this
 * order resting?" and it's derived, not stored.
 */
function OrderItem({ order }: { order: DexOrder }) {
  const sellInfo = useTokenInfo(order.sellToken);
  const buyInfo = useTokenInfo(order.buyToken);

  const sellSymbol =
    sellInfo.data?.symbol ?? `#${order.sellToken.toString()}`;
  const buySymbol = buyInfo.data?.symbol ?? `#${order.buyToken.toString()}`;

  const sellDecimals = tokenDecimals(
    order.sellToken,
    sellInfo.data?.decimals,
  );
  const buyDecimals = tokenDecimals(order.buyToken, buyInfo.data?.decimals);

  const filled = order.sellAmount - order.remainingAmount;

  const limitPrice = useMemo<string | null>(() => {
    if (order.sellAmount === 0n || order.minBuyAmount === 0n) return null;
    const price = (order.minBuyAmount * 1_000_000n) / order.sellAmount;
    return (Number(price) / 1_000_000).toFixed(6);
  }, [order.sellAmount, order.minBuyAmount]);

  const expiresAt =
    order.expiresAtHeight > 0n ? order.expiresAtHeight.toString() : null;

  return (
    <li className="rounded-md border border-white/10 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[10px] uppercase leading-none ${order.mode === "active"
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "border-white/10 text-muted-foreground"
                }`}
            >
              {order.mode === "active" ? "Active" : "Passive"}
            </span>
            <span className="truncate font-medium">
              {sellSymbol} → {buySymbol}
            </span>
          </div>
          <div className="mt-0.5 font-mono text-xs text-muted-foreground">
            Order #{order.id.toString()}
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <div className="font-medium tabular-nums">
            {formatTokenAmount(order.remainingAmount, sellDecimals)}{" "}
            {sellSymbol}
          </div>
          <div className="text-xs text-muted-foreground">
            {order.isFullyFilled ? "filled" : "remaining"}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-2 text-xs">
        <div>
          <div className="text-muted-foreground">Limit price</div>
          <div className="tabular-nums">
            {limitPrice !== null
              ? `${limitPrice} ${buySymbol}/${sellSymbol}`
              : "—"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Filled</div>
          <div className="tabular-nums">
            {formatTokenAmount(filled, sellDecimals)} {sellSymbol}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Expires</div>
          <div className="tabular-nums">
            {expiresAt !== null ? `#${expiresAt}` : "Never"}
          </div>
        </div>
      </div>
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
  tokenId: bigint,
  recordDecimals: number | undefined,
): number {
  if (tokenId === 0n) return 5;
  return recordDecimals ?? 5;
}

export default Orders;