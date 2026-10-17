"use client";

import { useTokenMetadata, useYourBalances } from "@/lib/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Coins } from "lucide-react";
import Link from "next/link";
import {
  bigIntToHex,
  formatClrty,
  formatTokenAmount,
} from "@claritychain/rpc";
import type { TokenHolding } from "@/lib/hooks";
import { GlassCard } from "../GlassCard";
import { FC } from "react";

type props = {
  onCreateClick: () => void;
}

const YourTokens: FC <props> = ({
  onCreateClick
}) => {
  const balances = useYourBalances();
  const tokens = balances.data?.tokens ?? [];

  return (
    <GlassCard className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Coins className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">Your tokens</CardTitle>
            <CardDescription>
              Tokens this address currently holds or created.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {balances.loading && tokens.length === 0 && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {!balances.loading && tokens.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            You don't hold any tokens yet.{" "}
            <span onClick={onCreateClick} className="underline underline-offset-4 cursor-pointer">
              Create one
            </span>{" "}
            or receive one.
          </p>
        )}
        {tokens.length > 0 && (
          <ul className="divide-y">
            {tokens.map((t) => (
              <TokenRow key={t.tokenId.toString()} token={t} />
            ))}
          </ul>
        )}
      </CardContent>
    </GlassCard>
  );
}

function TokenRow({ token: t }: { token: TokenHolding }) {
  const metadata = useTokenMetadata(t.tokenId);

  return (
    <li>
      <Link
        href={`/search/tokens/${t.tokenId.toString()}`}
        className="flex items-center justify-between gap-4 p-3 text-sm hover:bg-muted/30"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {metadata.data && (
              <img
                src={metadata.data.image}
                alt=""
                className="size-6 rounded"
              />
            )}
            <span className="font-medium">
              {t.symbol ?? `Token #${t.tokenId}`}
            </span>
            {t.isCreated && t.balance === 0n && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                Created
              </span>
            )}
            <div className="font-mono text-xs text-muted-foreground">
              #{t.tokenId.toString()}
              {t.name ? ` · ${t.name}` : ""}
            </div>
          </div>
          {t.lockedInOrders > 0n && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {formatTokenAmount(t.lockedInOrders, t.decimals ?? 0)} locked
            </span>
          )}
        </div>
        <div className="text-right tabular-nums">
          <div>{formatTokenAmount(t.balance, t.decimals ?? 0)}</div>
          {t.clrtyValue !== null && t.clrtyValue > 0n && t.creator && (
            <div className="text-xs text-muted-foreground">
              ≈ {formatClrty(bigIntToHex(t.clrtyValue))} $CLRTY
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}

export default YourTokens;