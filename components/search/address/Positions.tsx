"use client";

import { FC } from "react";
import Link from "next/link";
import { AmmPosition, formatClrty, formatCount } from "@claritychain/rpc";
import { GlassCard } from "@/components/GlassCard";

type Props = {
  positions: AmmPosition[] | null;
};

const AddressPositions: FC<Props> = ({ positions }) => {
  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Liquidity positions</h3>
        {positions && (
          <span className="text-xs text-muted-foreground font-mono">
            {positions.length} open
          </span>
        )}
      </div>

      {positions === null ? (
        <p className="text-sm text-muted-foreground">
          Position data is not available.
        </p>
      ) : positions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No open liquidity positions.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-foreground/5">
          {positions.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between py-2 text-sm gap-4"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <Link
                  href={`/trade`}
                  className="font-mono text-xs hover:underline"
                >
                  Pool {formatCount(p.pool_id)}
                </Link>
                <span className="text-xs text-muted-foreground font-mono">
                  Position {formatCount(p.id)}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span className="font-mono text-xs">
                  {formatClrty(p.liquidity)} LP
                </span>
                {p.share_bps !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {(p.share_bps / 100).toFixed(2)}% share
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};

export default AddressPositions;