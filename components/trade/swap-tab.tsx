"use client";

import { useMemo, useState } from "react";
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
  hexToBigInt,
  applySlippage,
  BOOK_PRICE_SCALE,
} from "@claritychain/rpc";
import type { AmmPool, DexPool } from "@claritychain/rpc";
import { AlertTriangle, ArrowRight, Repeat } from "lucide-react";
import type { Pair } from "../../app/trade/page";
import { GlassCard } from "../GlassCard";


export function formatTokenAmount(amount: bigint, decimals: number): string {
  if (decimals === 0) return amount.toString();

  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const fraction = abs % divisor;

  if (fraction === 0n) return `${negative ? "-" : ""}${whole}`;

  const fracStr = fraction.toString().padStart(decimals, "0");
  return `${negative ? "-" : ""}${whole}.${fracStr}`;
}

export function computeSwapOutput(
  reserveIn: bigint,
  reserveOut: bigint,
  amountIn: bigint,
  feeBps: bigint,
): bigint {
  if (reserveIn === 0n || reserveOut === 0n || amountIn <= 0n) return 0n;

  const FEE_DENOM = 10_000n;
  const feeMultiplier = FEE_DENOM - feeBps;
  const amountInAfterFee = (amountIn * feeMultiplier) / FEE_DENOM;

  const numerator = reserveOut * amountInAfterFee;
  const denominator = reserveIn + amountInAfterFee;
  return numerator / denominator;
}

const DEFAULT_SLIPPAGE_BPS = 50;

export function SwapTab({ pair }: { pair: Pair }) {
  const wallet = useWallet();
  const baseInfo = useTokenInfo(pair.base);
  const quoteInfo = useTokenInfo(pair.quote);
  const pools = usePoolsForToken(pair.base);
  const { submit, submitting, error, clearError } = useSubmitTx();

  const [direction, setDirection] = useState<"base-to-quote" | "quote-to-base">(
    "base-to-quote",
  );
  const [amountIn, setAmountIn] = useState("");
  const [slippageBps, setSlippageBps] = useState(String(DEFAULT_SLIPPAGE_BPS));

  const pool = useMemo<DexPool | null>(() => {
    return (
      (pools.data ?? []).find((p) => {
        const a = p.tokenA;
        const b = p.tokenB;
        return (
          (a === pair.base && b === pair.quote) ||
          (a === pair.quote && b === pair.base)
        );
      }) ?? null
    );
  }, [pools.data, pair.base, pair.quote]);

  const baseSymbol = baseInfo.data?.symbol ?? `#${pair.base}`;
  const quoteSymbol = quoteInfo.data?.symbol ?? `#${pair.quote}`;
  const baseDecimals = baseInfo.data?.decimals ?? 0;
  const quoteDecimals = quoteInfo.data?.decimals ?? 0;

  const quote = useMemo(() => {
    if (!pool) return null;
    const sellIsBase = direction === "base-to-quote";
    const sellDecimals = sellIsBase ? baseDecimals : quoteDecimals;
    const amount = safeParseAmount(amountIn, sellDecimals);
    if (amount === null || amount <= 0n) return null;

    const poolIsBaseFirst = pool.tokenA === pair.base;
    const sellBase = sellIsBase;
    const inputIsReserveA = poolIsBaseFirst === sellBase;

    const reserveIn = inputIsReserveA ? pool.reserveA : pool.reserveB;
    const reserveOut = inputIsReserveA ? pool.reserveB : pool.reserveA;

    const out = computeSwapOutput(reserveIn, reserveOut, amount, BigInt(pool.feeBps));
    if (out === 0n) return null;

    const slippage = Number(slippageBps) || 0;
    const minOut = applySlippage(out, slippage);
    return { amountIn: amount, amountOut: out, minOut };
  }, [
    pool,
    amountIn,
    direction,
    baseDecimals,
    quoteDecimals,
    slippageBps,
    pair.base,
  ]);

  const canSubmit =
    pool !== null &&
    quote !== null &&
    quote.amountIn > 0n &&
    !submitting &&
    wallet.address !== null;

  const onSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!pool || !quote || !wallet.address) return;

    try {
      const nonce = await currentNonce(wallet.address);
      const base = {
        from: wallet.address,
        fee: TX_CONSTANTS.fee,
        nonce,
        chainId: TX_CONSTANTS.chainId,
      };

      const unsigned = TxBuilder.swap({
        ...base,
        poolId: pool.id,
        tokenIn: direction === "base-to-quote" ? pair.base : pair.quote,
        amountIn: quote.amountIn,
        minAmountOut: quote.minOut,
        to: wallet.address,
      });

      await submit(unsigned, true);
      setAmountIn("");
    } catch {
      // submit() already set the error.
    }
  };

  if (!pool) {
    return (
      <GlassCard>
        <CardHeader>
          <Repeat className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="mt-2 text-lg">No pool for this pair</CardTitle>
          <CardDescription>
            {baseSymbol} / {quoteSymbol} does not have an AMM pool yet.
            Create one to enable swaps and liquidity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Switch to the Pool tab to create the pool.
          </p>
        </CardContent>
      </GlassCard>
    );
  }

  const sellSymbol = direction === "base-to-quote" ? baseSymbol : quoteSymbol;
  const buySymbol = direction === "base-to-quote" ? quoteSymbol : baseSymbol;
  const buyDecimals = direction === "base-to-quote" ? quoteDecimals : baseDecimals;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <GlassCard>
        <CardHeader>
          <Repeat className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="mt-2 text-lg">Swap</CardTitle>
          <CardDescription>
            The output is computed from the pool&apos;s current reserves.
            Your slippage tolerance sets the minimum you&apos;ll accept.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSwap} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                You pay
              </label>
              <div className="flex gap-2">
                <Input
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  placeholder="0.0"
                  inputMode="decimal"
                  disabled={submitting}
                />
                <div className="flex items-center rounded-md border px-3 text-sm">
                  {sellSymbol}
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setDirection((d) =>
                    d === "base-to-quote" ? "quote-to-base" : "base-to-quote",
                  )
                }
                disabled={submitting}
              >
                ⇅ flip direction
              </Button>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                You receive (estimated)
              </label>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm tabular-nums">
                {quote
                  ? `${formatTokenAmount(quote.amountOut, buyDecimals)} ${buySymbol}`
                  : "—"}
              </div>
              {quote && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Minimum received:{" "}
                  {formatTokenAmount(quote.minOut, buyDecimals)} {buySymbol}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Slippage tolerance (bps)
              </label>
              <Input
                value={slippageBps}
                onChange={(e) =>
                  setSlippageBps(e.target.value.replace(/\D/g, ""))
                }
                inputMode="numeric"
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {(Number(slippageBps) / 100).toFixed(2)}% — the swap will
                revert if the price moves more than this against you.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {submitting ? "Swapping…" : "Swap"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </GlassCard>

      <PoolSummary
        pool={pool}
        baseSymbol={baseSymbol}
        quoteSymbol={quoteSymbol}
        pair={pair}
      />
    </div>
  );
}

function PoolSummary({
  pool,
  baseSymbol,
  quoteSymbol,
  /**
   * The current swap direction, if the form has one. Used to
   * label the effective price correctly. When undefined, the
   * effective price row is hidden.
   */
  direction,
  /** The input amount in the currently-selected sell token's
   *  atomic units, if the form has one. */
  amountIn,
  pair,
}: {
  pool: DexPool;
  baseSymbol: string;
  quoteSymbol: string;
  direction?: "base-to-quote" | "quote-to-base";
  amountIn?: bigint;
  pair: Pair;
}) {
  //  The pool's token_a and token_b are canonicalized by the
  //  executor: token_a has the lower id, token_b the higher.
  //  The "spot price" the user cares about is in the pair's
  //  direction, which may or may not match the pool's. Compute
  //  it against the caller's orientation.
  const price = useMemo(() => {
    if (pool.reserveA === 0n) return null;

    //  Canonical spot price: quote per base, in the pool's
    //  frame, as a decimal. Scaling by BOOK_PRICE_SCALE keeps
    //  the intermediate arithmetic in bigint; the final
    //  division to a JS number happens once.
    const scaled =
      (pool.reserveB * BOOK_PRICE_SCALE) / pool.reserveA;
    const canonical = Number(scaled) / Number(BOOK_PRICE_SCALE);

    //  Which token is the pool's base? Lower id. If the
    //  caller's pair.base is the pool's tokenA, then the
    //  canonical price is already in the pair's direction.
    //  Otherwise, invert it.
    const poolBaseIsPairBase = pool.tokenA === pair.base;
    return {
      canonical,
      inPairDirection: poolBaseIsPairBase ? canonical : 1 / canonical,
    };
  }, [pool.reserveA, pool.reserveB, pool.tokenA, pair.base]);

  //  The effective price for the current input, if there is one.
  //  This is `amountOut / amountIn` at the executed amount,
  //  which is the number that shows slippage against the spot
  //  price. It's the same computation the swap form does, but
  //  the pool card is showing it next to the pool's own price
  //  so the user can see the two side by side.
  const effective = useMemo(() => {
    if (!direction || amountIn === undefined || amountIn <= 0n) {
      return null;
    }
    const sellIsBase = direction === "base-to-quote";
    const poolIsBaseFirst = pool.tokenA === pair.base;
    const inputIsReserveA = poolIsBaseFirst === sellIsBase;

    const reserveIn = inputIsReserveA ? pool.reserveA : pool.reserveB;
    const reserveOut = inputIsReserveA ? pool.reserveB : pool.reserveA;

    const amountOut = computeSwapOutput(
      reserveIn,
      reserveOut,
      amountIn,
      BigInt(pool.feeBps),
    );
    if (amountOut === 0n) return null;

    //  Effective price = output per unit of input, as a
    //  decimal. Both amounts are in the same atomic scale (the
    //  pool's 5-decimal pool scale), so the ratio is
    //  scale-independent — the decimals cancel.
    const priceScaled = (amountOut * BOOK_PRICE_SCALE) / amountIn;
    const priceNumber = Number(priceScaled) / Number(BOOK_PRICE_SCALE);

    return {
      price: priceNumber,
      //  The slippage against spot, as a percentage. Negative is
      //  worse than spot, which is what a swap always is — the
      //  fee alone puts the effective price below spot.
      slippageVsSpot:
        price !== null
          ? (priceNumber / price.inPairDirection - 1) * 100
          : null,
    };
  }, [
    direction,
    amountIn,
    pool.reserveA,
    pool.reserveB,
    pool.feeBps,
    pool.tokenA,
    pair.base,
    price,
  ]);

  return (
    <GlassCard>
      <CardHeader>
        <CardTitle className="text-lg">Pool</CardTitle>
        <CardDescription>
          {baseSymbol} / {quoteSymbol}, constant-product with a{" "}
          {(pool.feeBps / 100).toFixed(2)}% fee.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {price !== null && (
          <>
            <Row
              label="Price"
              value={`${price.inPairDirection.toFixed(6)} ${quoteSymbol} per ${baseSymbol}`}
            />
            {effective && direction && (
              <Row
                label="Effective for this swap"
                value={
                  <span className="text-right">
                    {effective.price.toFixed(6)}{" "}
                    {direction === "base-to-quote"
                      ? `${quoteSymbol} per ${baseSymbol}`
                      : `${baseSymbol} per ${quoteSymbol}`}
                    {effective.slippageVsSpot !== null && (
                      <span className="ml-2 text-xs text-destructive">
                        ({effective.slippageVsSpot.toFixed(2)}% vs spot)
                      </span>
                    )}
                  </span>
                }
              />
            )}
          </>
        )}

        <Row label="Reserve A" value={formatTokenAmount(pool.reserveA, 5)} />
        <Row label="Reserve B" value={formatTokenAmount(pool.reserveB, 5)} />
        <Row
          label="Total liquidity"
          value={formatTokenAmount(pool.totalLiquidity, 5)}
        />
        <Row label="Fee" value={`${(pool.feeBps / 100).toFixed(2)}%`} />
        <Row
          label="Pool id"
          value={<span className="font-mono text-xs">#{pool.id}</span>}
        />
        <Row label="Active" value={pool.active ? "Yes" : "No"} />
      </CardContent>
    </GlassCard>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function safeParseAmount(raw: string, decimals: number): bigint | null {
  const t = raw.trim();
  if (t.length === 0) return null;
  if (!/^\d+(\.\d*)?$/.test(t)) return null;
  const [whole, frac = ""] = t.split(".");
  if (frac.length > decimals) return null;
  return BigInt(whole + frac.padEnd(decimals, "0"));
}