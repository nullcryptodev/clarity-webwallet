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
import {
  usePoolsForToken,
  useTokenInfo,
  useYourPositions,
} from "@/lib/hooks";
import {
  useSubmitTx,
  TX_CONSTANTS,
  currentNonce,
} from "@/lib/use-submit-tx";
import {
  TxBuilder,
  formatTokenAmount,
} from "@claritychain/rpc";
import type { DexPool, DexPosition } from "@claritychain/rpc";
import { AlertTriangle, Droplets, Trash2 } from "lucide-react";
import type { Pair } from "@/app/trade/page";
import { GlassCard } from "../GlassCard";

export function lpShareBps(liquidity: bigint, totalLiquidity: bigint): number {
  if (totalLiquidity === 0n) return 0;
  return Number((liquidity * 10_000n) / totalLiquidity);
}

export function reservesForRemoval(
  liquidity: bigint,
  totalLiquidity: bigint,
  reserveA: bigint,
  reserveB: bigint,
): { reserveA: bigint; reserveB: bigint } {
  if (totalLiquidity === 0n) {
    return { reserveA: 0n, reserveB: 0n };
  }

  //  Proportional share, floored. Matches the executor's
  //  removeLiquidity math.
  const shareA = (reserveA * liquidity) / totalLiquidity;
  const shareB = (reserveB * liquidity) / totalLiquidity;

  return { reserveA: shareA, reserveB: shareB };
}

// ================================================================
// Constants
// ================================================================

const NATIVE_TOKEN_ID = 0n;

/**
 * The minimum CLRTY-side deposit the pool executor accepts, at
 * the pool's 5-decimal scale. 10,000,000 at 5 decimals is 100
 * CLRTY. A pool whose CLRTY side is below this is rejected by
 * the executor with a token-precondition error; enforcing the
 * floor here means the form refuses to submit rather than the
 * node refusing to apply.
 */
const MIN_POOL_LIQUIDITY = 100_000_00n;

// ================================================================
// Helpers
// ================================================================

/**
 * The decimals to use when parsing a user-typed amount for a
 * pool deposit.
 *
 * The value comes from the token's record. For the native token
 * the record reports 5 — the pool scale — and for every other
 * token it reports the token's own decimals, which are the same
 * at the balance layer and the pool layer.
 *
 * The `?? 5` fallback applies only while the record is still
 * loading; by the time the user has entered an amount, the
 * record is populated and the field is authoritative.
 */
function poolDecimals(recordDecimals: number | undefined): number {
  return recordDecimals ?? 5;
}

/**
 * Parse a decimal string into atomic units at the given scale.
 * Returns null on malformed input rather than throwing, because
 * the callers use this during render for validation.
 */
function parseAmount(raw: string, decimals: number): bigint | null {
  const t = raw.trim();
  if (t.length === 0) return null;
  if (!/^\d+(\.\d*)?$/.test(t)) return null;
  const [whole, frac = ""] = t.split(".");
  if (frac.length > decimals) return null;
  return BigInt(whole + frac.padEnd(decimals, "0"));
}

// ================================================================
// Pool tab
// ================================================================

export function PoolTab({ pair }: { pair: Pair }) {
  const wallet = useWallet();
  const pools = usePoolsForToken(pair.base);
  const baseInfo = useTokenInfo(pair.base);
  const quoteInfo = useTokenInfo(pair.quote);
  const positions = useYourPositions();

  // The parsed pool for this pair, if one exists.
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

  // The user's position in this pool, if any.
  const position = useMemo<DexPosition | null>(() => {
    if (!pool || !wallet.address) return null;
    const poolId = pool.id;
    return (
      (positions.data ?? []).find(
        (p) => p.poolId === poolId && p.owner === wallet.address,
      ) ?? null
    );
  }, [pool, positions.data, wallet.address]);

  const baseSymbol = baseInfo.data?.symbol ?? `#${pair.base}`;
  const quoteSymbol = quoteInfo.data?.symbol ?? `#${pair.quote}`;

  // Pool scale, not balance scale. See poolDecimals.
  const baseDecimals = poolDecimals(baseInfo.data?.decimals);
  const quoteDecimals = poolDecimals(quoteInfo.data?.decimals);

  if (!pool) {
    return (
      <CreatePoolCard
        pair={pair}
        baseSymbol={baseSymbol}
        quoteSymbol={quoteSymbol}
        baseDecimals={baseDecimals}
        quoteDecimals={quoteDecimals}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 items-start">
      <AddLiquidityCard
        pool={pool}
        pair={pair}
        baseSymbol={baseSymbol}
        quoteSymbol={quoteSymbol}
        baseDecimals={baseDecimals}
        quoteDecimals={quoteDecimals}
      />
      <div className="space-y-6">
        <PoolStateCard pool={pool} />
        {position && (
          <RemoveLiquidityCard position={position} pool={pool} />
        )}
      </div>
    </div>
  );
}

// ================================================================
// Create pool
// ================================================================

function CreatePoolCard({
  pair,
  baseSymbol,
  quoteSymbol,
  baseDecimals,
  quoteDecimals,
}: {
  pair: Pair;
  baseSymbol: string;
  quoteSymbol: string;
  baseDecimals: number;
  quoteDecimals: number;
}) {
  const wallet = useWallet();
  const { submit, submitting, error, clearError } = useSubmitTx();
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [feeBps, setFeeBps] = useState("30");

  const a = parseAmount(amountA, baseDecimals);
  const b = parseAmount(amountB, quoteDecimals);
  const fee = Number(feeBps);

  //  The floor applies to whichever side is CLRTY, or to neither
  //  side if it's a token/token pool.
  const needsFloorA = pair.base === NATIVE_TOKEN_ID;
  const needsFloorB = pair.quote === NATIVE_TOKEN_ID;

  const meetsFloor =
    a !== null &&
    b !== null &&
    (!needsFloorA || a >= MIN_POOL_LIQUIDITY) &&
    (!needsFloorB || b >= MIN_POOL_LIQUIDITY);

  const canSubmit =
    wallet.address !== null &&
    a !== null &&
    a > 0n &&
    b !== null &&
    b > 0n &&
    meetsFloor &&
    Number.isFinite(fee) &&
    fee >= 0 &&
    fee <= 1000 &&
    !submitting;

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const from = wallet.address;
    if (!from || a === null || b === null) return;

    try {
      const nonce = await currentNonce(from);
      const unsigned = TxBuilder.createPool({
        from,
        fee: TX_CONSTANTS.fee,
        nonce,
        chainId: TX_CONSTANTS.chainId,
        tokenA: pair.base,
        amountA: a,
        tokenB: pair.quote!,
        amountB: b,
        feeBps: fee,
      });
      const hex = Array.from(unsigned.body)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      console.log("[create-pool] payload", {
        length: unsigned.body.length,
        hex,
      });
      await submit(unsigned, true);
    } catch (e) {
      console.log(e instanceof Error ? e.message : String(e));
      // submit() already set the error.
    }
  };

  //  What the user will see when the form is filled in and
  //  either side is below the floor. `amountA` and `amountB`
  //  are strings, so the empty-string case is not a violation.
  const showFloorWarning =
    (a !== null && needsFloorA && a < MIN_POOL_LIQUIDITY) ||
    (b !== null && needsFloorB && b < MIN_POOL_LIQUIDITY);

  return (
    <GlassCard>
      <CardHeader>
        <Droplets className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="mt-2 text-lg">
          Create a {baseSymbol} / {quoteSymbol} pool
        </CardTitle>
        <CardDescription>
          The first deposit sets the initial price. Choose the ratio
          carefully; the AMM uses it as the starting point.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              {baseSymbol} amount
              <span className="ml-2 text-muted-foreground/70">
                ({baseDecimals} decimals)
              </span>
            </label>
            <Input
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
              placeholder="0.0"
              inputMode="decimal"
              disabled={submitting}
            />
            {needsFloorA && (
              <p className="mt-1 text-xs text-muted-foreground">
                Minimum{" "}
                {formatTokenAmount(MIN_POOL_LIQUIDITY, baseDecimals)}{" "}
                {baseSymbol}.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              {quoteSymbol} amount
              <span className="ml-2 text-muted-foreground/70">
                ({quoteDecimals} decimals)
              </span>
            </label>
            <Input
              value={amountB}
              onChange={(e) => setAmountB(e.target.value)}
              placeholder="0.0"
              inputMode="decimal"
              disabled={submitting}
            />
            {needsFloorB && (
              <p className="mt-1 text-xs text-muted-foreground">
                Minimum{" "}
                {formatTokenAmount(MIN_POOL_LIQUIDITY, quoteDecimals)}{" "}
                {quoteSymbol}.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Fee (bps)
            </label>
            <Input
              value={feeBps}
              onChange={(e) => setFeeBps(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {Number.isFinite(fee) ? (fee / 100).toFixed(2) : "0.00"}% per
              swap, paid to LPs.
            </p>
          </div>

          {showFloorWarning && (
            <p className="text-xs text-destructive">
              {needsFloorA && needsFloorB
                ? "Both amounts must be at least the pool minimum."
                : needsFloorA
                  ? `The ${baseSymbol} side must be at least ${formatTokenAmount(MIN_POOL_LIQUIDITY, baseDecimals)}.`
                  : `The ${quoteSymbol} side must be at least ${formatTokenAmount(MIN_POOL_LIQUIDITY, quoteDecimals)}.`}
            </p>
          )}

          {error && <ErrorNote message={error} />}

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? "Creating…" : "Create pool"}
          </Button>
        </form>
      </CardContent>
    </GlassCard>
  );
}

// ================================================================
// Add liquidity
// ================================================================

function AddLiquidityCard({
  pool,
  pair,
  baseSymbol,
  quoteSymbol,
  baseDecimals,
  quoteDecimals,
}: {
  pool: DexPool;
  pair: Pair;
  baseSymbol: string;
  quoteSymbol: string;
  baseDecimals: number;
  quoteDecimals: number;
}) {
  const wallet = useWallet();
  const { submit, submitting, error, clearError } = useSubmitTx();
  const [amountA, setAmountA] = useState("");

  // Does the pool hold the pair's base as its tokenA? Determines
  // whether a deposit of "base" goes in as token_a or token_b.
  const tokenAIsBase = pool.tokenA === pair.base;

  const reserveA = pool.reserveA;
  const reserveB = pool.reserveB;

  // The derived second amount: for the deposit to preserve the
  // ratio (and therefore the price), the second amount must be
  // amountA * reserveB / reserveA.
  const derivedB = useMemo(() => {
    const a = parseAmount(amountA, baseDecimals);
    if (a === null || a <= 0n || reserveA === 0n) return null;
    return (a * reserveB) / reserveA;
  }, [amountA, baseDecimals, reserveA, reserveB]);

  const canSubmit =
    wallet.address !== null &&
    derivedB !== null &&
    derivedB > 0n &&
    !submitting;

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const from = wallet.address;
    if (!from) return;
    const a = parseAmount(amountA, baseDecimals);
    if (a === null || derivedB === null) return;

    try {
      const nonce = await currentNonce(from);
      const unsigned = TxBuilder.addLiquidity({
        from,
        fee: TX_CONSTANTS.fee,
        nonce,
        chainId: TX_CONSTANTS.chainId,
        poolId: pool.id,
        tokenIn: tokenAIsBase ? pair.base : pair.quote,
        amountIn: a,
        amountOther: derivedB,
      });
      await submit(unsigned, true);
      setAmountA("");
    } catch {
      // submit() already set the error.
    }
  };

  return (
    <GlassCard>
      <CardHeader>
        <Droplets className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="mt-2 text-lg">Add liquidity</CardTitle>
        <CardDescription>
          Deposit both tokens in the pool&apos;s current ratio. The second
          amount is derived to keep the price unchanged.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onAdd} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              {baseSymbol} amount
            </label>
            <Input
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
              placeholder="0.0"
              inputMode="decimal"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              {quoteSymbol} amount (derived)
            </label>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm tabular-nums">
              {derivedB !== null
                ? formatTokenAmount(derivedB, quoteDecimals)
                : "—"}
            </div>
          </div>
          {error && <ErrorNote message={error} />}
          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? "Adding…" : "Add liquidity"}
          </Button>
        </form>
      </CardContent>
    </GlassCard>
  );
}

// ================================================================
// Remove liquidity
// ================================================================

function RemoveLiquidityCard({
  position,
  pool,
}: {
  position: DexPosition;
  pool: DexPool;
}) {
  const wallet = useWallet();
  const { submit, submitting, error, clearError } = useSubmitTx();
  const [percent, setPercent] = useState("100");

  const liquidity = position.liquidity;
  const shareBps = lpShareBps(liquidity, pool.totalLiquidity);
  const { reserveA, reserveB } = reservesForRemoval(
    liquidity,
    pool.totalLiquidity,
    pool.reserveA,
    pool.reserveB,
  );

  const removeAmount = useMemo(() => {
    const p = Number(percent);
    if (!Number.isFinite(p) || p <= 0 || p > 100) return null;
    return (liquidity * BigInt(Math.round(p))) / 100n;
  }, [liquidity, percent]);

  const canSubmit =
    wallet.address !== null &&
    removeAmount !== null &&
    removeAmount > 0n &&
    !submitting;

  const onRemove = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const from = wallet.address;
    if (!from || removeAmount === null) return;
    try {
      const nonce = await currentNonce(from);
      const unsigned = TxBuilder.removeLiquidity({
        from,
        fee: TX_CONSTANTS.fee,
        nonce,
        chainId: TX_CONSTANTS.chainId,
        positionId: position.id,
        amount: removeAmount,
      });
      await submit(unsigned, true);
    } catch {
      // submit() already set the error.
    }
  };

  return (
    <GlassCard>
      <CardHeader>
        <Trash2 className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="mt-2 text-lg">Remove liquidity</CardTitle>
        <CardDescription>
          Your share: {(shareBps / 100).toFixed(2)}% of the pool.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onRemove} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Token A</div>
              <div className="mt-1 tabular-nums">
                {formatTokenAmount(reserveA, 5)}
              </div>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Token B</div>
              <div className="mt-1 tabular-nums">
                {formatTokenAmount(reserveB, 5)}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Percent to remove
            </label>
            <div className="flex gap-2">
              <Input
                value={percent}
                onChange={(e) =>
                  setPercent(e.target.value.replace(/\D/g, ""))
                }
                inputMode="numeric"
                disabled={submitting}
              />
              <div className="flex items-center rounded-md border px-3 text-sm">
                %
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              {[25, 50, 75, 100].map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPercent(String(p))}
                  disabled={submitting}
                >
                  {p}%
                </Button>
              ))}
            </div>
          </div>

          {error && <ErrorNote message={error} />}
          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? "Removing…" : "Remove liquidity"}
          </Button>
        </form>
      </CardContent>
    </GlassCard>
  );
}

// ================================================================
// Pool state
// ================================================================

function PoolStateCard({ pool }: { pool: DexPool }) {
  return (
    <GlassCard>
      <CardHeader>
        <CardTitle className="text-lg">Pool state</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row
          label="Reserve A"
          value={formatTokenAmount(pool.reserveA, 5)}
        />
        <Row
          label="Reserve B"
          value={formatTokenAmount(pool.reserveB, 5)}
        />
        <Row
          label="Total liquidity"
          value={formatTokenAmount(pool.totalLiquidity, 5)}
        />
        <Row label="Fee" value={`${(pool.feeBps / 100).toFixed(2)}%`} />
        <Row label="Active" value={pool.active ? "Yes" : "No"} />
      </CardContent>
    </GlassCard>
  );
}

// ================================================================
// Small building blocks
// ================================================================

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      {message}
    </div>
  );
}