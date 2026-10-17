"use client";

import { FC, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatClrty, formatCount, humanTypeName, RpcError, shortAddress, shortHash, timeAgo, TxWithLocation } from "@claritychain/rpc";
import { rpc } from "@/lib/rpc";
import { GlassCard } from "@/components/GlassCard";

type Props = {
  address: string;
  /** Ignored when `pollMs` is not 0; kept for API compatibility. */
  transactions?: TxWithLocation[] | null;
  pageSize?: number;
  /**
   * Page size when the transaction list is fetched directly by this
   * component. The `transactions` prop is preferred for the initial
   * render (so the parent can pass a preselected batch), but this
   * component takes over paging from the RPC after mount.
   */
  initialTransactions?: TxWithLocation[] | null;
};

const AddressTransactions: FC<Props> = ({
  address,
  transactions: initialFromParent,
  initialTransactions,
  pageSize = 10,
}) => {
  const [rows, setRows] = useState<TxWithLocation[]>(
    initialFromParent ?? initialTransactions ?? [],
  );
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  //  Cache block timestamps across pages. A page's rows can span
  //  dozens of distinct heights; fetching each one once and reusing
  //  it is what keeps the per-page network cost bounded.
  const blockTimesRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        //  Fetch enough transactions to cover the current page.
        //  The RPC method has no offset parameter yet, so this is
        //  the honest workaround: ask for everything up to the end
        //  of the current page, then slice out the window we want.
        //
        //  Cost is O(offset + pageSize) in RPC work, not
        //  O(pageSize). Fine up to a few hundred transactions, which
        //  is what a first-cut explorer needs. Once the chain has
        //  real activity, the right fix is an offset parameter on
        //  the C++ method.
        const fetchLimit = offset + pageSize;
        const resp = await rpc.getTransactionsForAddress(
          address,
          fetchLimit,
        );

        if (cancelled) return;

        const all = resp.transactions;
        const slice = all.slice(offset, offset + pageSize);
        setRows(slice);

        //  If the RPC returned exactly `fetchLimit` transactions,
        //  there may be more. Otherwise we've hit the end of the
        //  address's history.
        setHasMore(all.length === fetchLimit);

        //  Ensure every block the slice references has a cached
        //  timestamp.
        const times = blockTimesRef.current;
        const missing: string[] = [];
        const seen = new Set<string>();
        for (const entry of slice) {
          if (
            !times.has(entry.block_height) &&
            !seen.has(entry.block_height)
          ) {
            missing.push(entry.block_height);
            seen.add(entry.block_height);
          }
        }

        if (missing.length > 0) {
          const fetched = await Promise.all(
            missing.map(async (h) => {
              try {
                const header = await rpc.getBlockHeaderByNumber(h);
                return [h, header.timestamp_ms] as const;
              } catch {
                return null;
              }
            }),
          );
          if (!cancelled) {
            for (const pair of fetched) {
              if (pair) times.set(pair[0], pair[1]);
            }
          }
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof RpcError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Could not reach the node");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [address, offset, pageSize]);

  const page = Math.floor(offset / pageSize) + 1;
  const canPrev = offset > 0;
  const canNext = !loading && hasMore;

  function goPrev() {
    setOffset(Math.max(0, offset - pageSize));
  }

  function goNext() {
    setOffset(offset + pageSize);
  }

  return (
    <GlassCard>
      <div className="p-4 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-medium">Recent transactions</h3>
          {rows.length > 0 && (
            <span className="text-xs text-muted-foreground font-mono">
              Page {page} · showing {offset + 1}–{offset + rows.length}
              {hasMore ? " (more available)" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goPrev}
            disabled={!canPrev || loading}
          >
            Newer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goNext}
            disabled={!canNext || loading}
          >
            Older
          </Button>
        </div>
      </div>

      <hr />

      <div className="p-4">
        {error ? (
          <div className="text-destructive text-sm">{error}</div>
        ) : loading && rows.length === 0 ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-foreground/5">
            {rows.map((entry) => (
              <TransactionRow
                key={entry.tx.hash}
                address={address}
                entry={entry}
                timestamp={blockTimesRef.current.get(entry.block_height)}
              />
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

type RowProps = {
  address: string;
  entry: TxWithLocation;
  timestamp: string | undefined;
};

const TransactionRow: FC<RowProps> = ({ address, entry, timestamp }) => {
  const tx = entry.tx;
  const isOutgoing = tx.from === address;
  const counterparty = isOutgoing ? tx.to : tx.from;

  //  A transfer of the native token is the common case and gets the
  //  simplest display. Everything else gets a token tag so the
  //  reader knows the amount isn't denominated in CLRTY.
  const isNative = tx.token_id === "0x0";
  const tokenLabel = isNative ? "CLRTY" : `token ${formatCount(tx.token_id)}`;

  return (
    <div className="flex items-start justify-between py-3 text-sm gap-4">
      {/* ---- left column: hash, type, counterparty ---- */}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <Link
          href={`/search/transactions/${tx.hash}`}
          className="font-mono text-xs hover:underline truncate"
        >
          {shortHash(tx.hash, 14, 10)}
        </Link>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={
              isOutgoing
                ? "text-destructive"
                : "text-green-600 dark:text-green-400"
            }
          >
            {isOutgoing ? "→" : "←"}
          </span>
          <span>{humanTypeName(tx.type)}</span>
          {counterparty && (
            <>
              <span>·</span>
              <Link
                href={`/search/address/${counterparty}`}
                className="font-mono hover:underline"
              >
                {shortAddress(counterparty, 10, 8)}
              </Link>
            </>
          )}
        </div>

        {/* ---- fee + nonce on their own line ---- */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            fee <span className="font-mono">{formatClrty(tx.fee)}</span>
          </span>
          <span>
            nonce <span className="font-mono">{formatCount(tx.nonce)}</span>
          </span>
        </div>
      </div>

      {/* ---- right column: amount + block + age ---- */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="font-mono text-xs">
          {formatClrty(tx.amount)}{" "}
          <span className="text-muted-foreground">{tokenLabel}</span>
        </span>

        <Link
          href={`/search/blocks/${BigInt(entry.block_height).toString()}`}
          className="text-xs text-muted-foreground hover:underline"
        >
          block #{formatCount(entry.block_height)}
        </Link>

        <span className="text-xs text-muted-foreground">
          index {entry.index}
          {timestamp ? ` · ${timeAgo(timestamp)}` : ""}
        </span>
      </div>
    </div>
  );
};

export default AddressTransactions;