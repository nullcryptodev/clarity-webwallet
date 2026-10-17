"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/lib/wallet";
import { usePoolsForToken, useTokenInfo } from "@/lib/hooks";
import {
  useSubmitTx,
  TX_CONSTANTS,
  currentNonce,
} from "@/lib/use-submit-tx";
import {
  TxBuilder,
  formatTokenAmount,
  formatPrice,
  BOOK_PRICE_SCALE,
} from "@claritychain/rpc";
import type {
  DexOrderBook,
  DexOrderBookLevel,
  DexPool,
} from "@claritychain/rpc";
import { AlertTriangle, ArrowRight, LineChart, RefreshCcw } from "lucide-react";
import type { Pair } from "@/app/trade/page";
import { dex } from "@/lib/rpc";
import { GlassCard } from "../GlassCard";

export function LimitTab({ pair }: { pair: Pair }) {
  const wallet = useWallet();
  const baseInfo = useTokenInfo(pair.base);
  const quoteInfo = useTokenInfo(pair.quote);
  const pools = usePoolsForToken(pair.base);
  const { submit, submitting, error, clearError } = useSubmitTx();

  const [side, setSide] = useState<"sell-base" | "sell-quote">("sell-base");
  const [mode, setMode] = useState<"passive" | "active">("passive");
  const [sellAmount, setSellAmount] = useState("");
  const [minBuyAmount, setMinBuyAmount] = useState("");
  const [expiresAtHeight, setExpiresAtHeight] = useState("");
  const [poolId, setPoolId] = useState<string>("");
  const [bookRefresh, setBookRefresh] = useState(0);

  //  The book's price is denominated in quote-per-base at the
  //  pool scale. Rendering it needs the same scale the amounts
  //  use, which is 5 for the native token side and the token's
  //  own decimals otherwise. If both tokens end up at 5 (the
  //  common case for a CLRTY / user-token pair), the price reads
  //  as a plain decimal.
  const priceDecimals = poolDecimals(pair.base, baseInfo.data?.decimals);

  const pool = useMemo<DexPool | null>(() => {
    return (
      (pools.data ?? []).find(
        (p) =>
          (p.tokenA === pair.base && p.tokenB === pair.quote) ||
          (p.tokenA === pair.quote && p.tokenB === pair.base),
      ) ?? null
    );
  }, [pools.data, pair.base, pair.quote]);

  useEffect(() => {
    if (pool && poolId === "") setPoolId(pool.id.toString());
  }, [pool, poolId]);

  const baseSymbol = baseInfo.data?.symbol ?? `#${pair.base}`;
  const quoteSymbol = quoteInfo.data?.symbol ?? `#${pair.quote}`;
  //  Pool scale for the native token; the token's own decimals
  //  otherwise. Same rule as the swap and pool tabs.
  const baseDecimals = poolDecimals(pair.base, baseInfo.data?.decimals);
  const quoteDecimals = poolDecimals(pair.quote, quoteInfo.data?.decimals);

  const sellTokenId = side === "sell-base" ? pair.base : pair.quote;
  const buyTokenId = side === "sell-base" ? pair.quote : pair.base;
  const sellDecimals = side === "sell-base" ? baseDecimals : quoteDecimals;
  const buyDecimals = side === "sell-base" ? quoteDecimals : baseDecimals;
  const sellSymbol = side === "sell-base" ? baseSymbol : quoteSymbol;
  const buySymbol = side === "sell-base" ? quoteSymbol : baseSymbol;

  const sellParsed = parseAmount(sellAmount, sellDecimals);
  const minBuyParsed = parseAmount(minBuyAmount, buyDecimals);

  const canSubmit =
    wallet.address !== null &&
    sellParsed !== null &&
    sellParsed > 0n &&
    minBuyParsed !== null &&
    minBuyParsed > 0n &&
    (mode === "passive" || poolId !== "") &&
    !submitting;

  const onPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const from = wallet.address;
    if (!from || sellParsed === null || minBuyParsed === null) return;

    try {
      const nonce = await currentNonce(from);
      const unsigned = TxBuilder.createOrder({
        from,
        fee: TX_CONSTANTS.fee,
        nonce,
        chainId: TX_CONSTANTS.chainId,
        sellToken: sellTokenId,
        sellAmount: sellParsed,
        buyToken: buyTokenId,
        minBuyAmount: minBuyParsed,
        mode,
        poolId: mode === "active" ? BigInt(poolId) : 0n,
        expiresAtHeight: expiresAtHeight ? BigInt(expiresAtHeight) : 0n,
      });
      await submit(unsigned, true);
      setSellAmount("");
      setMinBuyAmount("");
      //  A Passive order may have rested in the book, or an
      //  Active-without-conditions order may have routed against
      //  the pool. Either way the book the right-hand side is
      //  showing is now stale; bump the refresh key so the
      //  BookCard refetches.
      setBookRefresh((n) => n + 1);
    } catch {
      // submit() already set the error.
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <GlassCard>
        <CardHeader>
          <LineChart className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="mt-2 text-lg">Place a limit order</CardTitle>
          <CardDescription>
            Passive orders rest in the book. Active orders route against the
            pool.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onPlace} className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("passive")}
                className={`flex-1 rounded-md border px-3 py-2 text-sm ${mode === "passive"
                    ? "border-foreground/40 bg-muted/40"
                    : "hover:bg-muted/30"
                  }`}
                disabled={submitting}
              >
                Passive (book)
              </button>
              <button
                type="button"
                onClick={() => setMode("active")}
                className={`flex-1 rounded-md border px-3 py-2 text-sm ${mode === "active"
                    ? "border-foreground/40 bg-muted/40"
                    : "hover:bg-muted/30"
                  }`}
                disabled={submitting}
              >
                Active (pool)
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Side
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSide("sell-base")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm ${side === "sell-base"
                      ? "border-foreground/40 bg-muted/40"
                      : "hover:bg-muted/30"
                    }`}
                  disabled={submitting}
                >
                  Sell {baseSymbol}
                </button>
                <button
                  type="button"
                  onClick={() => setSide("sell-quote")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm ${side === "sell-quote"
                      ? "border-foreground/40 bg-muted/40"
                      : "hover:bg-muted/30"
                    }`}
                  disabled={submitting}
                >
                  Sell {quoteSymbol}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Sell amount ({sellSymbol})
              </label>
              <Input
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                placeholder="0.0"
                inputMode="decimal"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Minimum buy amount ({buySymbol})
              </label>
              <Input
                value={minBuyAmount}
                onChange={(e) => setMinBuyAmount(e.target.value)}
                placeholder="0.0"
                inputMode="decimal"
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The limit price is this amount divided by the sell amount.
                The order won&apos;t fill for less.
              </p>
            </div>

            {mode === "active" && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Pool id
                </label>
                <Input
                  value={poolId}
                  onChange={(e) =>
                    setPoolId(e.target.value.replace(/\D/g, ""))
                  }
                  inputMode="numeric"
                  disabled={submitting || pool !== null}
                />
                {pool === null && (
                  <p className="mt-1 text-xs text-destructive">
                    No pool exists for this pair. Create one first, or
                    switch to Passive.
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Expires at height (optional)
              </label>
              <Input
                value={expiresAtHeight}
                onChange={(e) =>
                  setExpiresAtHeight(e.target.value.replace(/\D/g, ""))
                }
                inputMode="numeric"
                placeholder="0 for no expiry"
                disabled={submitting}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {submitting ? "Placing…" : "Place order"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </GlassCard>

      <BookCard pair={pair} refreshKey={bookRefresh} priceDecimals={priceDecimals} />
    </div>
  );
}

// ================================================================
// Order book
// ================================================================

function BookCard({
  pair,
  refreshKey,
  priceDecimals,
}: {
  pair: Pair;
  refreshKey: number;
  priceDecimals: number
}) {
  const [book, setBook] = useState<DexOrderBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dex
      .getOrderBook(pair.base, pair.quote, 10)
      .then((b) => {
        if (!cancelled) {
          setBook(b);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to load the book.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pair.base, pair.quote, refreshKey]);

  //  The price scale is a protocol constant. Use the imported
  //  value rather than the one the server sends, so a client-side
  //  mismatch is visible in one place.
  const priceScale = BOOK_PRICE_SCALE;

  return (
    <GlassCard>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Order book</CardTitle>
          <CardDescription>
            Resting Passive orders, best price first.
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setBook(null)}
          disabled={loading}
          aria-label="Refresh book"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!book && !error && loading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {book && (
          <div className="space-y-4">
            <BookSide
              label="Bids"
              levels={book.bids}
              priceScale={priceScale}
              side="bid"
              priceDecimals={priceDecimals}
            />
            <BookSide
              label="Asks"
              levels={book.asks}
              priceScale={priceScale}
              side="ask"
              priceDecimals={priceDecimals}
            />
          </div>
        )}
      </CardContent>
    </GlassCard>
  );
}

function BookSide({
  label,
  levels,
  priceScale,
  side,
  priceDecimals
}: {
  label: string;
  levels: DexOrderBookLevel[];
  priceScale: bigint;
  side: "bid" | "ask";
  priceDecimals: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="text-[10px] uppercase text-muted-foreground">
          price · size · count
        </span>
      </div>
      {levels.length === 0 ? (
        <p className="text-xs text-muted-foreground">Empty.</p>
      ) : (
        <ul className="space-y-1">
          {levels.map((l, i) => (
            <li
              key={i}
              className="flex items-center justify-between text-xs tabular-nums"
            >
              <span
                className={side === "bid" ? "text-green-600" : "text-red-600"}
              >
                {formatPrice(l.price, priceScale, priceDecimals)}
              </span>
              <span className="text-muted-foreground">
                {formatTokenAmount(l.totalBase, 5)}
              </span>
              <span className="text-muted-foreground">{l.orderCount}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ================================================================
// Helpers
// ================================================================

/**
 * The decimals to use for a token's amounts at the pool scale.
 *
 * The native token's record reports 5, which is the pool scale.
 * Non-native tokens use their own record's decimals. The `?? 5`
 * fallback applies only while the record loads.
 */
function poolDecimals(
  tokenId: bigint,
  recordDecimals: number | undefined,
): number {
  if (tokenId === 0n) return 5;
  return recordDecimals ?? 5;
}

function parseAmount(raw: string, decimals: number): bigint | null {
  const t = raw.trim();
  if (t.length === 0) return null;
  if (!/^\d+(\.\d*)?$/.test(t)) return null;
  const [whole, frac = ""] = t.split(".");
  if (frac.length > decimals) return null;
  return BigInt(whole + frac.padEnd(decimals, "0"));
}