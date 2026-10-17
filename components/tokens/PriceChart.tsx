"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  usePlotArea,
  useYAxisScale,
} from "recharts";
import { CandlestickChart, LineChart as LineChartIcon } from "lucide-react";
import { useEpochInfo, usePoolsForToken } from "@/lib/hooks";
import { BOOK_PRICE_SCALE } from "@claritychain/rpc";
import type { DexPool } from "@claritychain/rpc";
import type { Pair } from "@/app/trade/page";

//  How many epochs the chart shows at once. The window is the
//  current epoch and the EPOCH_WINDOW - 1 before it; the chart
//  slides forward as the chain advances.
const EPOCH_WINDOW = 15;

//  Prefix for the localStorage key. The full key is the prefix
//  plus the pool id, so each pool's observations are stored
//  separately. Switching pairs loads a different buffer.
const STORAGE_PREFIX = "clarity.priceChart.pool.";

interface Candle {
  /** The epoch this candle summarizes. The x-axis. */
  epoch: number;
  /** First observation in the epoch, human-readable price. */
  open: number;
  /** Highest observation. */
  high: number;
  /** Lowest observation. */
  low: number;
  /** Last observation. */
  close: number;
  /** How many observations landed in this epoch. */
  samples: number;
  /** True if the chain hasn't moved past this epoch yet. */
  live: boolean;
}

interface Observation {
  /** The epoch the observation belongs to. */
  epoch: number;
  /** The pool's spot price at observation time. */
  price: number;
}

/**
 * One slot in the chart's data. Every epoch in the window gets
 * one, whether or not there's a candle for it.
 */
interface ChartSlot {
  epoch: number;
  placeholder: number;
  candle: Candle | null;
}

type props = {
  pair: Pair;
  baseSymbol: string;
  quoteSymbol: string;
};

export function TokenPriceChart({ pair, baseSymbol, quoteSymbol }: props) {
  const pools = usePoolsForToken(pair.base);
  const epochInfo = useEpochInfo();

  const pool = useMemo<DexPool | null>(() => {
    return (
      (pools.data ?? []).find(
        (p) =>
          (p.tokenA === pair.base && p.tokenB === pair.quote) ||
          (p.tokenA === pair.quote && p.tokenB === pair.base),
      ) ?? null
    );
  }, [pools.data, pair.base, pair.quote]);

  const [observations, setObservations] = useState<Observation[]>([]);

  //  The localStorage key for the current pool, or null while the
  //  pool is unknown. Every persistence effect is gated on this
  //  being non-null, so nothing is read or written before the
  //  pool id is available.
  const storageKey = pool ? `${STORAGE_PREFIX}${pool.id}` : null;

  //  Hydrate the buffer from localStorage when the pool changes.
  //  Switching pairs reads a different buffer; coming back to a
  //  previous pair restores its buffer.
  //
  //  Runs whenever storageKey changes, which covers the initial
  //  load (key goes from null to a value once the pool is
  //  fetched) and any pair change. The stored data is filtered
  //  against the current epoch window so a stale buffer doesn't
  //  reintroduce epochs the chart wouldn't draw anyway.
  useEffect(() => {
    if (!storageKey) {
      setObservations([]);
      return;
    }
    if (!epochInfo.data) {
      //  No epoch info yet, so we can't apply the window filter.
      //  Load the raw buffer; the trim effect below will bound it
      //  once epochInfo arrives.
      try {
        const raw = window.localStorage.getItem(storageKey);
        setObservations(raw ? (JSON.parse(raw) as Observation[]) : []);
      } catch {
        setObservations([]);
      }
      return;
    }

    const currentEpoch = Number(epochInfo.data.epoch);
    const cutoff = currentEpoch - EPOCH_WINDOW + 1;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setObservations([]);
        return;
      }
      const parsed = JSON.parse(raw) as Observation[];
      if (!Array.isArray(parsed)) {
        setObservations([]);
        return;
      }
      setObservations(parsed.filter((o) => o.epoch >= cutoff));
    } catch {
      //  Malformed JSON or localStorage disabled. Start fresh;
      //  the chart still works for the current session.
      setObservations([]);
    }
  }, [storageKey, epochInfo.data]);

  //  Trim the buffer whenever the epoch advances past the
  //  visible window. Runs on every epoch change and prunes any
  //  observations that have rolled off the left edge. Without
  //  this, a session left open for a long time would accumulate
  //  observations the chart never draws.
  useEffect(() => {
    if (!epochInfo.data) return;
    const currentEpoch = Number(epochInfo.data.epoch);
    const cutoff = currentEpoch - EPOCH_WINDOW + 1;
    setObservations((prev) => {
      const trimmed = prev.filter((o) => o.epoch >= cutoff);
      if (trimmed.length === prev.length) return prev;
      return trimmed;
    });
  }, [epochInfo.data]);

  //  Append an observation on every pool snapshot, tagged with
  //  the epoch it belongs to.
  useEffect(() => {
    if (!pool) return;
    if (!epochInfo.data) return;
    const price = spotPriceAsNumber(pool);
    if (price === null) return;

    const interval = Number(epochInfo.data.rotation_interval);
    const height = Number(epochInfo.data.current_height);
    if (interval <= 0) return;
    const epoch = Math.floor(height / interval);

    setObservations((prev) => {
      const next = [...prev, { epoch, price }];
      const cutoff = epoch - EPOCH_WINDOW + 1;
      return next.filter((o) => o.epoch >= cutoff);
    });
  }, [pool, epochInfo.data]);

  //  Persist the buffer on every change. Skipped when there's no
  //  storage key (no pool yet) or when localStorage is
  //  unavailable. Failures are silent — persistence is a
  //  convenience, not a requirement.
  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(observations));
    } catch {
      //  Quota exceeded, private mode, or storage disabled. The
      //  chart still works for the current session.
    }
  }, [storageKey, observations]);

  //  Fold observations into one slot per epoch in the visible
  //  window, ordered ascending. Slots without observations have
  //  a null candle and are skipped by the drawing layer.
  const chartData = useMemo<ChartSlot[]>(() => {
    if (!epochInfo.data) return [];
    const currentEpoch = Number(epochInfo.data.epoch);
    const windowStart = Math.max(0, currentEpoch - (EPOCH_WINDOW - 1));

    const byEpoch = new Map<number, Observation[]>();
    for (const o of observations) {
      if (o.epoch < windowStart || o.epoch > currentEpoch) continue;
      let bucket = byEpoch.get(o.epoch);
      if (!bucket) {
        bucket = [];
        byEpoch.set(o.epoch, bucket);
      }
      bucket.push(o);
    }

    const out: ChartSlot[] = [];
    for (let epoch = windowStart; epoch <= currentEpoch; epoch++) {
      const obs = byEpoch.get(epoch);
      if (!obs || obs.length === 0) {
        out.push({ epoch, placeholder: 1, candle: null });
        continue;
      }
      let open = obs[0]!.price;
      let close = obs[0]!.price;
      let high = obs[0]!.price;
      let low = obs[0]!.price;
      for (const o of obs) {
        if (o.price > high) high = o.price;
        if (o.price < low) low = o.price;
      }
      close = obs[obs.length - 1]!.price;
      out.push({
        epoch,
        placeholder: 1,
        candle: {
          epoch,
          open,
          high,
          low,
          close,
          samples: obs.length,
          live: epoch >= currentEpoch,
        },
      });
    }
    return out;
  }, [observations, epochInfo.data]);

  const latest = useMemo<number | null>(() => {
    for (let i = chartData.length - 1; i >= 0; i--) {
      const c = chartData[i]?.candle;
      if (c !== null && c !== undefined) return c.close;
    }
    return null;
  }, [chartData]);

  const domain = useMemo<[number, number]>(
    () => priceDomain(chartData),
    [chartData],
  );

  const chartConfig = {
    up: {
      label: `${quoteSymbol} up`,
      theme: { light: "var(--chart-2)", dark: "var(--chart-2)" },
    },
    down: {
      label: `${quoteSymbol} down`,
      theme: { light: "var(--chart-5)", dark: "var(--chart-5)" },
    },
  } satisfies ChartConfig;

  const ready = pair.base !== pair.quote;

  if (!ready) {
    return (
      <EmptyChart
        title="Price"
        description="Select a pair to see its price."
      />
    );
  }

  if (!pool) {
    return (
      <EmptyChart
        title="Price"
        description={`No pool exists for ${baseSymbol} / ${quoteSymbol} yet. Create one to see a price.`}
      />
    );
  }

  const currentEpoch = epochInfo.data ? Number(epochInfo.data.epoch) : null;
  const hasAnyCandle = chartData.some((s) => s.candle !== null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CandlestickChart className="h-5 w-5 text-muted-foreground" />
            {baseSymbol} / {quoteSymbol}
          </CardTitle>
          <CardDescription>
            One candle per epoch, from the pool&apos;s observed spot
            price. Recorded client-side.
          </CardDescription>
        </div>
        {latest !== null && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">
              {quoteSymbol} per {baseSymbol}
            </div>
            <div className="text-xl font-semibold tabular-nums">
              {latest.toFixed(6)}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {currentEpoch === null ? (
          <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Loading epoch info…
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="h-[220px] min-h-[220px] w-full"
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              barCategoryGap="20%"
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="epoch"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(e) => `#${e}`}
              />
              <YAxis
                dataKey="placeholder"
                type="number"
                domain={domain}
                tickFormatter={(v) => (v as number).toFixed(6)}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={80}
              />
              <ChartTooltip
                cursor={false}
                content={({ active, payload }) => (
                  <CandleTooltipContent
                    active={active}
                    payload={
                      payload as unknown as
                      | readonly { payload: ChartSlot }[]
                      | undefined
                    }
                    quoteSymbol={quoteSymbol}
                    baseSymbol={baseSymbol}
                  />
                )}
              />
              <Bar
                dataKey="placeholder"
                fill="transparent"
                isAnimationActive={false}
                shape={() => <g />}
              />
              <CandleLayer chartData={chartData} />
            </BarChart>
          </ChartContainer>
        )}

        {!hasAnyCandle && currentEpoch !== null && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            No observations yet in the visible window. A candle appears
            for each epoch the session observes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ================================================================
// Candle layer
// ================================================================

/**
 * Draws the candlesticks using the chart's own coordinate
 * context.
 *
 * Must be rendered as a direct child of <BarChart>, so the
 * `usePlotArea` and `useYAxisScale` hooks can read the chart
 * context. In Recharts v3 the older `Customized` component no
 * longer forwards the axis maps or offset that its v2
 * counterpart carried; the hooks are the intended replacement.
 *
 * `usePlotArea()` returns the pixel rectangle of the drawing
 * region: `{ x, y, width, height }`. `useYAxisScale()`
 * returns a function mapping a data value to a pixel position,
 * or `undefined` while the chart is still laying out.
 *
 * The x-position of each candle is derived from the plot area
 * and the number of slots: for a categorical axis, the slot
 * width is exactly `plotArea.width / chartData.length`, and
 * slot i's left edge is `plotArea.x + i * slotWidth`.
 */
function CandleLayer({ chartData }: { chartData: ChartSlot[] }) {
  const plotArea = usePlotArea();
  const yScale = useYAxisScale();

  //  Recharts returns `undefined` for both during the first
  //  render, before it has measured the container and built the
  //  scales. Returning null here means the candles appear one
  //  frame after the axes, which is the correct behaviour.
  if (!plotArea || !yScale || chartData.length === 0) return null;

  const { x, width } = plotArea;
  const slotWidth = width / chartData.length;

  return (
    <g>
      {chartData.map((slot, i) => {
        const c = slot.candle;
        if (c === null) return null;

        const slotLeft = x + i * slotWidth;
        const centerX = slotLeft + slotWidth / 2;
        const bodyWidth = Math.max(2, slotWidth * 0.6);

        const yHigh = yScale(c.high);
        const yLow = yScale(c.low);
        const yOpen = yScale(c.open);
        const yClose = yScale(c.close);

        //  The scale returns `undefined` for values it can't map.
        //  Skip the candle rather than drawing it at position
        //  NaN.
        if (
          yHigh === undefined ||
          yLow === undefined ||
          yOpen === undefined ||
          yClose === undefined
        ) {
          return null;
        }

        const bodyTop = Math.min(yOpen, yClose);
        const bodyBottom = Math.max(yOpen, yClose);
        //  A flat candle (open == close) would have zero body
        //  height; a 1px body keeps it visible as a dash.
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);

        const isUp = c.close >= c.open;
        const color = isUp ? "var(--color-up)" : "var(--color-down)";

        return (
          <g key={slot.epoch}>
            {/* Wick: a 1px vertical line from high to low. */}
            <line
              x1={centerX}
              x2={centerX}
              y1={yHigh}
              y2={yLow}
              stroke={color}
              strokeWidth={1}
              strokeDasharray={c.live ? "2 2" : undefined}
            />
            {/* Body: a filled rect from open to close. */}
            <rect
              x={slotLeft + (slotWidth - bodyWidth) / 2}
              y={bodyTop}
              width={bodyWidth}
              height={bodyHeight}
              fill={color}
              fillOpacity={c.live ? 0.5 : 1}
              stroke={color}
              strokeWidth={1}
              strokeDasharray={c.live ? "2 2" : undefined}
            />
          </g>
        );
      })}
    </g>
  );
}

// ================================================================
// Tooltip content
// ================================================================

/**
 * A tooltip that shows the full OHLC for the hovered candle,
 * plus the number of observations that landed in that epoch.
 *
 * Slots with no candle have nothing to show; the tooltip
 * returns null for those, so hovering an empty slot shows no
 * tooltip at all.
 */
function CandleTooltipContent({
  active,
  payload,
  quoteSymbol,
  baseSymbol,
}: {
  active?: boolean;
  payload?: readonly { payload: ChartSlot }[];
  quoteSymbol: string;
  baseSymbol: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const slot = payload[0]!.payload;
  const candle = slot.candle;
  if (!candle) return null;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">Epoch #{candle.epoch}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 tabular-nums">
        <span className="text-muted-foreground">Open</span>
        <span className="text-right">{candle.open.toFixed(6)}</span>
        <span className="text-muted-foreground">High</span>
        <span className="text-right">{candle.high.toFixed(6)}</span>
        <span className="text-muted-foreground">Low</span>
        <span className="text-right">{candle.low.toFixed(6)}</span>
        <span className="text-muted-foreground">Close</span>
        <span className="text-right">{candle.close.toFixed(6)}</span>
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {candle.samples} observation{candle.samples === 1 ? "" : "s"}
        {" · "}
        {quoteSymbol} per {baseSymbol}
        {candle.live && " · live"}
      </div>
    </div>
  );
}

// ================================================================
// Helpers
// ================================================================

/**
 * Compute the pool's spot price as a JS number, in human units.
 *
 * The pool's spot price is `reserveB / reserveA` in the pool's
 * canonical frame, where `token_a` is the base and `token_b` is
 * the quote.
 */
function spotPriceAsNumber(pool: DexPool): number | null {
  if (pool.reserveA === 0n || pool.reserveB === 0n) return null;
  const scaled = (pool.reserveB * BOOK_PRICE_SCALE) / pool.reserveA;
  return Number(scaled) / Number(BOOK_PRICE_SCALE);
}

/**
 * The y-axis domain. Pads the observed min/max by 5% so candles
 * don't touch the edges, and handles the flat-range case (all
 * observations equal) by padding by 1% of the value.
 *
 * Slots without candles are skipped. If there are no candles at
 * all, a nominal [0, 1] domain keeps the axis visible until the
 * first observation arrives.
 */
function priceDomain(chartData: ChartSlot[]): [number, number] {
  const candles = chartData
    .map((s) => s.candle)
    .filter((c): c is Candle => c !== null);
  if (candles.length === 0) return [0, 1];
  let min = candles[0]!.low;
  let max = candles[0]!.high;
  for (const c of candles) {
    if (c.low < min) min = c.low;
    if (c.high > max) max = c.high;
  }
  const range = max - min;
  if (range === 0) {
    const pad = Math.abs(max) * 0.01 || 0.01;
    return [min - pad, max + pad];
  }
  const pad = range * 0.05;
  return [min - pad, max + pad];
}

// ================================================================
// Empty state
// ================================================================

function EmptyChart({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <LineChartIcon className="h-5 w-5 text-muted-foreground" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          {description}
        </div>
      </CardContent>
    </Card>
  );
}