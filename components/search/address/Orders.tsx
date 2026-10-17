"use client";

import { FC } from "react";
import Link from "next/link";
import { formatClrty, formatCount, Order } from "@claritychain/rpc";
import { GlassCard } from "@/components/GlassCard";

type Props = {
  orders: Order[] | null;
};

const AddressOrders: FC<Props> = ({ orders }) => {
  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Open orders</h3>
        {orders && (
          <span className="text-xs text-muted-foreground font-mono">
            {orders.length} open
          </span>
        )}
      </div>

      {orders === null ? (
        <p className="text-sm text-muted-foreground">
          Order data is not available.
        </p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open orders.</p>
      ) : (
        <div className="flex flex-col divide-y divide-foreground/5">
          {orders.map((o) => (
            <div
              key={o.id}
              className="flex items-start justify-between py-2 text-sm gap-4"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <Link
                  href={`/trade`}
                  className="font-mono text-xs hover:underline"
                >
                  Order {formatCount(o.id)}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatClrty(o.sell_amount)} token {formatCount(o.sell_token)}{" "}
                  → {formatClrty(o.min_buy_amount)} token {formatCount(o.buy_token)}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span className="text-xs text-muted-foreground">{o.mode}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  filled {formatClrty(o.filled_amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};

export default AddressOrders;