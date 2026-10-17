"use client";

import { FC } from "react";

import { rpc } from "@/lib/rpc";
import { useAsync } from "@/lib/hooks";
import { GlassCard } from "../GlassCard";
import { ChainStats, formatClrty, formatCount, NodeStatus } from "@claritychain/rpc";

//  Direct RPC polling for v2. Once an indexer exists, replace the
//  polling logic with a single indexer query. The component itself
//  doesn't need to change, only the data source.
//
//  Two RPCs feed this card:
//
//    status         live node state: chain head height and network.
//    getChainStats  lifetime aggregates read from the state DB via
//                   O(1) lookups: supply, pot, unique counts, epoch,
//                   and the lifetime transaction counter.
//
//  Both calls run in parallel inside the fetcher. If either fails,
//  the previous values stay visible and the connection dot goes red.

interface ChainStat {
  text: string;
  value: string;
  hint?: string;
}

interface OverviewData {
  stats: ChainStat[];
}

const ChainOverview: FC = () => {
  const state = useAsync<OverviewData>(
    async () => {
      const [status, chain] = await Promise.all([
        rpc.status(),
        rpc.getChainStats(),
      ]);
      return { stats: buildStats(status, chain) };
    },
    [],
    { pollMs: 5_000 },
  );

  const stats = state.data?.stats ?? [];
  const connected = state.data !== null && state.error === null;
  const loading = state.loading && state.data === null;

  return (
    <GlassCard className="w-fit mx-auto">
      {stats.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="flex flex-wrap justify-center gap-10 p-2">
          {stats.map((stat) => (
            <div key={stat.text} className="w-full min-w-32 md:w-auto">
              <div
                className="mb-1 text-sm font-medium opacity-50"
                title={stat.hint}
              >
                {stat.text}
              </div>
              <p className="text-xl leading-tight">{stat.value}</p>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};

// ---------------------------------------------------------------------------
// Data shaping
// ---------------------------------------------------------------------------

function buildStats(status: NodeStatus, chain: ChainStats): ChainStat[] {
  return [
    {
      text: "Total Supply",
      value: `${formatClrty(chain.total_supply)} CLRTY`,
      hint: "Total minted CLRTY, including block rewards",
    },
    {
      text: "Reward Pot",
      value: `${formatClrty(chain.current_pot)} CLRTY`,
      hint: "Reward smoothing buffer accrued from unallocated rewards",
    },
    {
      text: "Chain Transactions",
      value: formatCount(chain.total_transactions),
      hint: "Lifetime confirmed transaction count, including block rewards and system txs",
    },
    {
      text: "Unique Addresses",
      value: formatCount(chain.unique_addresses),
      hint: "Accounts with a non-empty record in state",
    },
    {
      text: "Height / Epoch",
      value: formatCount(status.height) + " / " + formatCount(chain.epoch),
      hint: "Current chain head / Current epoch number (60 blocks each)",
    },
  ];
}

// ---------------------------------------------------------------------------
// Connection indicator
// ---------------------------------------------------------------------------

const ConnectionDot: FC<{ connected: boolean; loading: boolean }> = ({
  connected,
  loading,
}) => {
  const color = loading
    ? "bg-yellow-500"
    : connected
      ? "bg-green-500"
      : "bg-red-500";
  const label = loading ? "Connecting" : connected ? "Connected" : "Offline";

  return (
    <div className="flex items-center gap-2 text-xs opacity-60">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
};

export default ChainOverview;