"use client";

import { FC } from "react";
import Link from "next/link";
import {
  bigIntToHex,
  formatClrty,
  formatCount,
  hexToBigInt,
} from "@claritychain/rpc";
import type {
  Account,
  EpochInfo,
  FeeStats,
  Validator,
} from "@claritychain/rpc";
import type { Network } from "@claritychain/wallet";
import type { TokenHolding, UserBalance } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  Clock,
  Coins,
  ShieldCheck,
  Sprout,
  Users,
} from "lucide-react";
import { GlassCard } from "../GlassCard";

type props = {
  /** The network the app is configured for. */
  network: Network;
  /** The native CLRTY holding, or null while loading. */
  native: TokenHolding | null;
  /** Non-native holdings, already sorted by CLRTY value descending. */
  otherTokens: TokenHolding[];
  /** The wallet's account record, or null while loading. */
  account: Account | null;
  /** The wallet's validator record, or null if it isn't one. */
  validator: Validator | null;
  /** True while the balance is still loading. */
  loading: boolean;

  // ---- chain details ----

  height: bigint | null;
  epoch: EpochInfo | null;
  fees: FeeStats | null;
  activeSetSize: bigint | null;
  activeSetQuorum: bigint | null;
};

const WalletOverview: FC<props> = ({
  network,
  native,
  otherTokens,
  account,
  validator,
  loading,
  height,
  epoch,
  fees,
  activeSetSize,
  activeSetQuorum,
}) => {
  // Prefer the native holding's own fields; fall back to the
  // account record while the holding is still loading. The two
  // carry the same values on the wire.
  const staked =
    native?.staked ??
    (account ? hexToBigInt(account.staked) : null);
  const pendingRewards =
    native?.pendingRewards ??
    (account ? hexToBigInt(account.pending_rewards) : null);
  const optedOut =
    native?.stakingOptedOut ??
    account?.staking_opted_out ??
    null;

  // The total CLRTY-denominated value of everything the wallet
  // holds. Native plus every non-native token's pool-derived
  // valuation. Zero when nothing has a pool.
  const portfolioValue = native
    ? otherTokens.reduce(
      (sum, t) => sum + (t.clrtyValue ?? 0n),
      native.clrtyValue ?? native.balance,
    )
    : null;

  const otherTokenCount = otherTokens.length;

  return (
    <GlassCard backgroundImage="/blue-waves.png">
      <div
      />

      <div className="relative z-10">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overview
              </CardTitle>
              <WalletStatusLine
                optedOut={optedOut}
                staked={staked}
                validator={validator}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <NetworkBadge network={network} />
              {validator && <ValidatorBadge validator={validator} />}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 my-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-semibold tabular-nums">
                  {loading && !native
                    ? "…"
                    : native
                      ? formatClrty(bigIntToHex(native.balance))
                      : "0"}
                </span>
                <span className="text-lg text-muted-foreground">$CLRTY</span>
              </div>

              {portfolioValue !== null && otherTokenCount > 0 && (
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  ≈ {formatClrty(bigIntToHex(portfolioValue))} CLRTY total
                  portfolio value
                </p>
              )}

              <p className="mt-2 text-sm text-muted-foreground">
                {otherTokenCount > 0 ? (
                  <>
                    Plus {otherTokenCount} token
                    {otherTokenCount === 1 ? "" : "s"} in{" "}
                    <Link
                      href="/tokens"
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      your token list
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    No other tokens held.{" "}
                    <Link
                      href="/tokens"
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      Create one
                    </Link>
                    .
                  </>
                )}
              </p>
            </div>

            {(native || account) && (
              <div className="grid grid-cols-2 gap-3 pt-4">
                <div>
                  <div className="text-xs text-muted-foreground">Staked</div>
                  <div className="mt-0.5 text-sm font-medium tabular-nums">
                    {staked !== null
                      ? `${formatClrty(bigIntToHex(staked))} CLRTY`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Pending rewards
                  </div>
                  <div className="mt-0.5 text-sm font-medium tabular-nums">
                    {pendingRewards !== null
                      ? `${formatClrty(bigIntToHex(pendingRewards))} CLRTY`
                      : "—"}
                  </div>
                  {pendingRewards !== null && pendingRewards > 0n && (
                    <Link
                      href="/stake"
                      className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                      Claim on the stake page
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <ChainStrip
          height={height}
          epoch={epoch}
          fees={fees}
          activeSetSize={activeSetSize}
          activeSetQuorum={activeSetQuorum}
        />
      </div>
    </GlassCard>
  );
};


// ================================================================
// Wallet status line
// ================================================================

/**
 * A one-line description of the wallet's staking state.
 *
 * Three states, in order of specificity:
 *
 *   - A validator: the line defers to the validator badge, so
 *     this returns null and the badge alone carries the status.
 *   - A staker: shows since when and how much.
 *   - Opted out: says so, and links to the stake page.
 *   - Not staking: says so, and links to the stake page.
 *
 * The states are mutually exclusive, so the component picks the
 * first that matches.
 */
function WalletStatusLine({
  optedOut,
  staked,
  validator,
}: {
  optedOut: boolean | null;
  staked: bigint | null;
  validator: Validator | null;
}) {
  // Validators already have a badge; the status line would
  // duplicate it.
  if (validator) return null;

  if (optedOut === null || staked === null) {
    return (
      <p className="mt-1 text-xs text-muted-foreground">Loading…</p>
    );
  }

  if (optedOut) {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sprout className="size-3.5" />
        Staking is off.{" "}
        <Link
          href="/stake"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Opt in
        </Link>{" "}
        to earn a share of block rewards.
      </p>
    );
  }

  if (staked > 0n) {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sprout className="size-3.5" />
        Auto-staking is on. Rewards settle at each epoch boundary.
      </p>
    );
  }

  return (
    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Sprout className="size-3.5" />
      Not staking yet.{" "}
      <Link
        href="/stake"
        className="underline underline-offset-4 hover:text-foreground"
      >
        Opt in
      </Link>{" "}
      to earn a share of block rewards.
    </p>
  );
}

// ================================================================
// Chain strip
// ================================================================

/**
 * The chain's current state: height, epoch progress, typical fee,
 * and the active validator set.
 *
 * Four items, in a grid that collapses to two columns on medium
 * screens and one on narrow ones. The values are the chain's,
 * not the wallet's; the strip is visually separated from the
 * wallet's bands by a top border.
 *
 * The fourth item (the active set) is the one that answers "how
 * decentralised is this chain right now." It shows the set size
 * and, as a subvalue, the quorum threshold — the number of
 * validators that must agree for a block to commit.
 */
function ChainStrip({
  height,
  epoch,
  fees,
  activeSetSize,
  activeSetQuorum,
}: {
  height: bigint | null;
  epoch: EpochInfo | null;
  fees: FeeStats | null;
  activeSetSize: bigint | null;
  activeSetQuorum: bigint | null;
}) {
  const epochNumber = epoch ? hexToBigInt(epoch.epoch) : null;
  const epochProgress = epoch ? epochFraction(epoch) : null;

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 px-(--card-spacing) pt-(--card-spacing) sm:grid-cols-2 lg:grid-cols-4">
      <ChainItem
        icon={Activity}
        label="Block height"
        value={height !== null ? `#${formatCount(bigIntToHex(height))}` : "…"}
      />
      <ChainItem
        icon={Clock}
        label="Epoch"
        value={
          epochNumber !== null
            ? `#${formatCount(bigIntToHex(epochNumber))}`
            : "…"
        }
        subvalue={
          epochProgress !== null
            ? `${(epochProgress * 100).toFixed(1)}% complete`
            : undefined
        }
      />
      <ChainItem
        icon={Coins}
        label="Typical fee"
        value={fees ? formatTypicalFee(fees) : "…"}
        subvalue={fees ? "based on last epoch" : undefined}
      />
      <ChainItem
        icon={Users}
        label="Active validators"
        value={
          activeSetSize !== null
            ? formatCount(bigIntToHex(activeSetSize))
            : "…"
        }
        subvalue={
          activeSetQuorum !== null
            ? `${formatCount(bigIntToHex(activeSetQuorum))} quorum`
            : undefined
        }
      />
    </div>
  );
}

function ChainItem({
  icon: Icon,
  label,
  value,
  subvalue,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-3.5 flex-shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium tabular-nums">{value}</div>
        {subvalue && (
          <div className="text-xs text-muted-foreground">{subvalue}</div>
        )}
      </div>
    </div>
  );
}

// ================================================================
// Badges
// ================================================================

function NetworkBadge({ network }: { network: Network }) {
  const label = networkLabel(network);
  const color = networkColor(network);

  return (
    <span className="inline-flex cursor-default items-center gap-2 rounded-full border px-3 py-1 text-xs">
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function ValidatorBadge({ validator }: { validator: Validator }) {
  const label = validator.is_offline
    ? "Validator offline"
    : validator.is_active
      ? "Active validator"
      : "Validator";

  return (
    <Link
      href="/validator"
      className="inline-flex items-center gap-2 rounded-full border border-green-500/40 bg-green-500/5 px-3 py-1 text-xs text-blue-600 transition-colors hover:bg-green-500/10 dark:text-green-400"
    >
      <ShieldCheck className="size-3.5" />
      {label}
      <span className="font-mono text-muted-foreground">
        #{validator.id}
      </span>
    </Link>
  );
}

// ================================================================
// Helpers
// ================================================================

/**
 * How far into the current epoch the chain is, as a fraction in
 * [0, 1]. Derived from the epoch's interval and remaining
 * blocks.
 */
function epochFraction(epoch: EpochInfo): number | null {
  const interval = hexToBigInt(epoch.rotation_interval);
  const remaining = hexToBigInt(epoch.blocks_until_next_epoch);
  if (interval === 0n) return null;
  const elapsed = interval - remaining;
  const f = Number(elapsed) / Number(interval);
  return Math.min(1, Math.max(0, f));
}

/**
 * A human-readable fee estimate.
 *
 * `avg_fee_per_transaction` is the average paid across the last
 * window, which is a better predictor of "what will this cost me"
 * than the current minimum. If the field is missing or zero, the
 * line falls back to the average per block, which is still a
 * useful upper bound.
 */
function formatTypicalFee(fees: FeeStats): string {
  const perTx = hexToBigInt(fees.avg_fee_per_transaction);
  if (perTx > 0n) {
    return `${formatClrty(bigIntToHex(perTx))} CLRTY`;
  }
  const perBlock = hexToBigInt(fees.avg_fee_per_block);
  return `${formatClrty(bigIntToHex(perBlock))} CLRTY / block`;
}

function networkLabel(network: Network): string {
  switch (network) {
    case "mainnet":
      return "Mainnet";
    case "testnet":
      return "Testnet";
    case "regtest":
      return "Regtest";
    default: {
      const _exhaustive: never = network;
      return String(_exhaustive);
    }
  }
}

function networkColor(network: Network): string {
  switch (network) {
    case "mainnet":
      return "bg-green-500";
    case "testnet":
      return "bg-yellow-500";
    case "regtest":
      return "bg-blue-500";
    default: {
      const _exhaustive: never = network;
      return "";
    }
  }
}

export default WalletOverview;