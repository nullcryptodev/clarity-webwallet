import { GlassCard } from "@/components/GlassCard";
import { formatClrty, formatCount, humanTypeName, shortAddress, shortHash, TxWithLocation } from "@claritychain/rpc";
import Link from "next/link";
import { FC } from "react";

type props = {
  transfers: TxWithLocation[] | null;
  tokenSymbol: string;
}

const RecentTransactions: FC <props> = ({
  transfers, tokenSymbol
}) => {

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Recent transfers</h3>
        {transfers && (
          <span className="text-xs text-muted-foreground font-mono">
            {transfers.length} shown
          </span>
        )}
      </div>

      {transfers === null ? (
        <p className="text-sm text-muted-foreground">
          Transfer history is not available.
        </p>
      ) : transfers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No transfers yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-foreground/5">
          {transfers.map((entry) => {
            const tx = entry.tx;

            // On an address page, "incoming" vs "outgoing" is
            // meaningful because there's a specific address in
            // question. On a token page there isn't — every
            // transfer is shown from the token's point of view.
            // So we render "from → to" without the directional
            // arrow, since both endpoints are equally
            // interesting.
            return (
              <div
                key={tx.hash}
                className="flex items-center justify-between py-2 text-sm gap-4"
              >
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <Link
                    href={`/search/transactions/${tx.hash}`}
                    className="font-mono text-xs hover:underline truncate"
                  >
                    {shortHash(tx.hash, 12, 8)}
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                    <span>{humanTypeName(tx.type)}</span>
                    {tx.from && (
                      <>
                        <span>·</span>
                        <Link
                          href={`/search/address/${tx.from}`}
                          className="font-mono hover:underline truncate"
                        >
                          {shortAddress(tx.from, 8, 6)}
                        </Link>
                      </>
                    )}
                    {tx.to && (
                      <>
                        <span>→</span>
                        <Link
                          href={`/search/address/${tx.to}`}
                          className="font-mono hover:underline truncate"
                        >
                          {shortAddress(tx.to, 8, 6)}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="font-mono text-xs">
                    {formatClrty(tx.amount)} {tokenSymbol}
                  </span>
                  <Link
                    href={`/search/blocks/${formatCount(entry.block_height)}`}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    block #{formatCount(entry.block_height)}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  )
}

export default RecentTransactions;