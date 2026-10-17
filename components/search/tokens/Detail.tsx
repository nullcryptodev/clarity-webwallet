"use client";

import { FC, useEffect, useState } from "react";
import Link from "next/link";
import { formatClrty, formatCount, hexToBigInt, HolderEntry, humanTypeName, RpcError, shortAddress, shortHash, TokenInfo, TxWithLocation } from "@claritychain/rpc";
import { rpc } from "@/lib/rpc";
import { GlassCard } from "@/components/GlassCard";
import TokenOverview from "./Overview";
import RecentTransactions from "./RecentTransactions";

type Props = {
  tokenId: string;
};

const TokenDetail: FC<Props> = ({ tokenId }) => {
  const [token, setToken] = useState<TokenInfo | null>(null);
  const [supply, setSupply] = useState<string | null>(null);
  const [holders, setHolders] = useState<HolderEntry[] | null>(null);
  const [transfers, setTransfers] = useState<TxWithLocation[] | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const info = await rpc.getTokenInfo(tokenId);
        if (cancelled) return;
        setToken(info);

        // The three follow-up queries are independent. Any one
        // failing leaves its card in the "not available" state
        // without taking the whole page down. The token info
        // itself is the only thing whose failure is fatal —
        // without it there's nothing to render.
        const [supplyResult, holdersResult, transfersResult] =
          await Promise.allSettled([
            rpc.getTokenSupply(tokenId),
            rpc.getTokenHolders(tokenId, 20),
            rpc.getTokenTransfers(tokenId, 20),
          ]);

        if (cancelled) return;

        setSupply(
          supplyResult.status === "fulfilled"
            ? supplyResult.value.supply
            : null,
        );

        setHolders(
          holdersResult.status === "fulfilled"
            ? holdersResult.value.holders
            : null,
        );

        setTransfers(
          transfersResult.status === "fulfilled"
            ? transfersResult.value.transfers
            : null,
        );
      } catch (err) {
        if (cancelled) return;

        if (err instanceof RpcError) {
          // -32004 is TokenNotFound in JsonRpcError.h. We don't
          // special-case it because the message is already
          // human-readable, but keeping the check makes the
          // intent obvious if the error-code table ever moves.
          if (err.code === -32004) {
            setError("Token not found");
          } else {
            setError(err.message);
          }
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
  }, [tokenId]);

  if (loading) {
    return (
      <div className="bg-card border rounded-xl p-4">
        <div className="text-sm text-muted-foreground">Loading token…</div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="bg-card border rounded-xl p-4">
        <div className="text-sm text-destructive">
          {error ?? "Token not found"}
        </div>
      </div>
    );
  }

  const isNative = token.is_native;
  const maxSupplyBig = hexToBigInt(token.max_supply);
  const hasMaxSupply = maxSupplyBig > BigInt(0);
  const supplyBig = supply ? hexToBigInt(supply) : BigInt(0);

  // Minted percentage in basis points. The multiplication happens
  // in bigint space so it can't overflow; the result is bounded by
  // 10,000, so Number() is safe. Zero max_supply = unlimited, in
  // which case the bar isn't drawn.
  const mintedBps = hasMaxSupply
    ? Number((supplyBig * BigInt(10_000)) / maxSupplyBig)
    : 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <TokenOverview
          token={token}
          isNative={isNative}
          hasMaxSupply={hasMaxSupply}
          supply={supply}
          holders={holders ?? []}
        />

        <RecentTransactions
          transfers={transfers}
          tokenSymbol={token.symbol}
        />
      </div>

      {/* ---- Recent transfers card ---- */}
    </div>
  );
};

// Small helpers

const Row: FC<{
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ label, children, wide }) => (
  <div className={wide ? "md:col-span-2" : undefined}>
    <div className="text-xs text-muted-foreground mb-1">{label}</div>
    <div>{children}</div>
  </div>
);

export default TokenDetail;