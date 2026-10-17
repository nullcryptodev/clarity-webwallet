"use client";

import { FC, useCallback, useEffect, useState } from "react";
import { Button } from "../ui/button";
import {
  humanTypeName,
  shortAddress,
  timeAgo,
} from "@claritychain/rpc";
import { rpc } from "@/lib/rpc";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  RefreshCcw,
  Repeat,
} from "lucide-react";
import { ActivityEntry, toEntry } from "@/lib/activity-types";

// ================================================================
// Component
// ================================================================

const DEFAULT_PAGE_SIZE = 8;

type props =
  | {
    /**
     * Self-fetching mode. The component loads up to 100
     * entries for this address and pages through them
     * client-side.
     */
    address: string | null;
    entries?: undefined;
    loading?: undefined;
    pageSize?: number;
  }
  | {
    /**
     * Parent-driven mode. The component renders the entries
     * it's given. The parent MUST build them through
     * `toEntry`, or the `direction` field will be missing and
     * every row will render as "related".
     */
    address?: undefined;
    entries: ActivityEntry[];
    loading?: boolean;
    pageSize?: number;
  };

const Activity: FC<props> = (props) => {
  const { pageSize = DEFAULT_PAGE_SIZE } = props;
  const externalMode = props.entries !== undefined;

  const preloadedEntries = props.entries;
  const preloadedLoading = props.loading;
  const address = props.address;

  const [entries, setEntries] = useState<ActivityEntry[]>(
    preloadedEntries ?? [],
  );
  const [loading, setLoading] = useState(
    externalMode ? Boolean(preloadedLoading) : true,
  );
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (externalMode) {
      setEntries(preloadedEntries ?? []);
      setLoading(Boolean(preloadedLoading));
    }
  }, [externalMode, preloadedEntries, preloadedLoading]);

  const load = useCallback(async () => {
    if (externalMode) return;
    if (!address) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await rpc.getTransactionsForAddress(address, 100);
      setEntries(resp.transactions.map((t) => toEntry(address, t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [address, externalMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageStart = externalMode ? 0 : offset;
  const page = externalMode
    ? entries.slice(offset, offset + pageSize)
    : entries.slice(pageStart, pageStart + pageSize);
  const hasPrev = offset > 0;
  const hasNext = offset + pageSize < entries.length;

  const onPrev = () => setOffset((o) => Math.max(0, o - pageSize));
  const onNext = () => setOffset((o) => o + pageSize);
  const onRefresh = () => {
    setOffset(0);
    void load();
  };

  return (
    <div className="liquid-glass px-6 py-5">
      {/* Depth layers. Remove if you want a flatter surface or
          if a grid of glass cards becomes a GPU cost. */}
      <div className="lg-blur lg-blur-1" aria-hidden />
      <div className="lg-blur lg-blur-2" aria-hidden />

      <div className="relative z-10">
        <div className="mb-4 flex flex-row items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-medium">
              <ReceiptText className="h-5 w-5 text-muted-foreground" />
              Recent activity
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Transactions from, to, and involving this address.
            </p>
          </div>
          {!externalMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCcw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          )}
        </div>

        {loading && entries.length === 0 && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}

        {!loading && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {!loading && !error && entries.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No transactions yet.
          </p>
        )}

        {page.length > 0 && (
          <ul className="divide-y">
            {page.map((e) => (
              <ActivityRow key={e.txHash} entry={e} />
            ))}
          </ul>
        )}

        {entries.length > pageSize && (
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrev}
              disabled={!hasPrev || loading}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Newer
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {Math.floor(offset / pageSize) + 1} of{" "}
              {Math.ceil(entries.length / pageSize)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={!hasNext || loading}
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

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const { icon: Icon, color, label } = directionChrome(entry.direction);
  return (
    <li className="flex items-center justify-between gap-3 py-3 text-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex-shrink-0 rounded-full p-1.5 ${color}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-medium">{humanTypeName(entry.type)}</span>
            {entry.direction === "in" && (
              <span className="text-xs text-green-600">{label}</span>
            )}
            {entry.direction === "out" && (
              <span className="text-xs text-red-600">{label}</span>
            )}
            {entry.direction === "self" && (
              <span className="text-xs text-muted-foreground">{label}</span>
            )}
          </div>
          <div className="truncate font-mono text-xs text-muted-foreground">
            {counterpartyText(entry)}
          </div>
        </div>
      </div>
      <div className="text-right text-xs text-muted-foreground">
        <div>#{entry.blockHeight.toLocaleString()}</div>
        <div>{timeAgo(entry.blockHeight.toString())}</div>
      </div>
    </li>
  );
}

function directionChrome(direction: ActivityEntry["direction"]): {
  icon: typeof ArrowDownLeft;
  color: string;
  label: string;
} {
  switch (direction) {
    case "in":
      return {
        icon: ArrowDownLeft,
        color: "bg-green-500/10 text-green-600",
        label: "in",
      };
    case "out":
      return {
        icon: ArrowUpRight,
        color: "bg-red-500/10 text-red-600",
        label: "out",
      };
    case "self":
      return {
        icon: Repeat,
        color: "bg-muted text-muted-foreground",
        label: "self",
      };
    case "related":
    default:
      return {
        icon: Repeat,
        color: "bg-muted text-muted-foreground",
        label: "related",
      };
  }
}

function counterpartyText(entry: ActivityEntry): string {
  if (entry.direction === "in" && entry.from) {
    return `from ${shortAddress(entry.from)}`;
  }
  if (entry.direction === "out" && entry.to) {
    return `to ${shortAddress(entry.to)}`;
  }
  if (entry.direction === "self") {
    return shortAddress(entry.txHash);
  }
  if (entry.from && entry.to) {
    return `${shortAddress(entry.from)} → ${shortAddress(entry.to)}`;
  }
  return shortAddress(entry.txHash);
}

export default Activity;