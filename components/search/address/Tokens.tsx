"use client";

import { FC } from "react";
import Link from "next/link";
import { formatClrty, formatCount, TokenBalancePair } from "@claritychain/rpc";
import { GlassCard } from "@/components/GlassCard";

type Props = {
  tokens: TokenBalancePair[] | null;
};

const AddressTokens: FC<Props> = ({ tokens }) => {
  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Tokens</h3>
        {tokens && (
          <span className="text-xs text-muted-foreground font-mono">
            {tokens.length} held
          </span>
        )}
      </div>

      {tokens === null ? (
        <p className="text-sm text-muted-foreground">
          Token holdings are not available.
        </p>
      ) : tokens.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tokens held.</p>
      ) : (
        <div className="flex flex-col divide-y divide-foreground/5">
          {tokens.map((t) => {
            const isNative = t.token_id === "0x0";
            const tokenIdDecimal = isNative
              ? "0"
              : BigInt(t.token_id).toString();
            return (
              <div
                key={t.token_id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <Link
                  href={`/search/tokens/${t.token_id}`}
                  className="font-mono text-xs hover:underline"
                >
                  {isNative
                    ? "CLRTY (native)"
                    : `Token ${formatCount(t.token_id)}`}
                </Link>
                <span className="font-mono text-xs">
                  {formatClrty(t.balance)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
};

export default AddressTokens;