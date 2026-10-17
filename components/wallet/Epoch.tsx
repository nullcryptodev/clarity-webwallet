"use client";

import { FC } from "react";
import {
  hexToBigInt,
  formatCount,
  NOMINAL_BLOCK_SECONDS,
} from "@claritychain/rpc";
import type { EpochInfo } from "@claritychain/rpc";
import { Clock } from "lucide-react";

type props = {
  epoch: EpochInfo | null;
};

const Epoch: FC<props> = ({ epoch }) => {
  if (!epoch) return null;

  const current = hexToBigInt(epoch.epoch);
  const startHeight = hexToBigInt(epoch.epoch_start_height);
  const nextHeight = hexToBigInt(epoch.next_epoch_height);
  const currentHeight = hexToBigInt(epoch.current_height);
  const remaining = hexToBigInt(epoch.blocks_until_next_epoch);
  const interval = hexToBigInt(epoch.rotation_interval);

  // Progress through the epoch. interval is the length of one
  // epoch in blocks; remaining is how many are left. Clamp to
  // [0, 1] so a chain that reports a height beyond
  // next_epoch_height (which shouldn't happen, but might during a
  // sync) doesn't render a bar wider than the card.
  const elapsed = interval > 0n ? interval - remaining : 0n;
  const fraction =
    interval > 0n
      ? Math.min(1, Math.max(0, Number(elapsed) / Number(interval)))
      : 0;

  // Wall-clock estimate. Nominal block time is a constant, so
  // this is "roughly how long" rather than "exactly when". The
  // chain's actual block time varies with consensus; the number
  // is an order of magnitude, not a schedule.
  const secondsRemaining = remaining * NOMINAL_BLOCK_SECONDS;

  return (
    <div className="liquid-glass px-6 py-5">
      <div className="lg-blur lg-blur-1" aria-hidden />
      <div className="lg-blur lg-blur-2" aria-hidden />

      <div className="relative z-10">
        <div className="mb-4 flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-medium">
              Epoch {current.toString()}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Rewards settle, validators rotate, and NFT escrows
              decrement at each epoch boundary.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Current height"
              value={`#${formatCount(epoch.current_height)}`}
            />
            <Stat
              label="Next epoch at"
              value={`#${formatCount(epoch.next_epoch_height)}`}
            />
          </div>

          <div>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">
                {elapsed.toString()} / {interval.toString()} blocks
              </span>
              <span className="tabular-nums text-muted-foreground">
                {(fraction * 100).toFixed(1)}%
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(fraction * 100)}
              aria-label={`Epoch ${current.toString()} progress`}
            >
              <div
                className="h-full bg-foreground/70 transition-[width] duration-500"
                style={{ width: `${fraction * 100}%` }}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {remaining > 0n ? (
              <>
                About {formatDuration(Number(secondsRemaining))} until the next
                boundary.{" "}
              </>
            ) : (
              <>The next boundary is due now. </>
            )}
            {startHeight > 0n && (
              <>
                This epoch started at block{" "}
                <span className="font-mono">
                  #{formatCount(epoch.epoch_start_height)}
                </span>
                .
              </>
            )}
          </p>

          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              What happens at the boundary
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>
                Staking rewards move from the pot to stakers, and the
                effective APY updates.
              </li>
              <li>
                A slice of the active validator set rotates, sized to
                the BFT-safe fraction.
              </li>
              <li>
                NFT collection reward escrows decrement for every
                collection with an active schedule.
              </li>
              <li>
                Active orders with conditions are evaluated: routed if
                the conditions hold, cancelled if they don&apos;t.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

/**
 * Format a number of seconds as a short human duration. Rounds
 * to the nearest meaningful unit: minutes under an hour, hours
 * under a day, days above that. The chain's nominal block time
 * is a target, not a guarantee, so the output is deliberately
 * approximate.
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)} minutes`;
  const hours = minutes / 60;
  if (hours < 48) return `${Math.round(hours)} hours`;
  return `${Math.round(hours / 24)} days`;
}

export default Epoch;