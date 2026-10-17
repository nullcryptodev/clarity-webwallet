"use client";

import { FC, useEffect, useState } from "react";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatClrty, formatCount, RpcError, shortAddress, TokenInfo } from "@claritychain/rpc";
import { rpc } from "@/lib/rpc";
import { GlassCard } from "../GlassCard";

type Props = {
  pageSize?: number;
};

const TokensList: FC<Props> = ({ pageSize = 50 }) => {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!cancelled && tokens.length === 0) setLoading(true);
      if (!cancelled) setError(null);

      try {
        const resp = await rpc.getAllTokens(pageSize, offset);
        if (cancelled) return;
        setTokens(resp.tokens);
        setConnected(true);
      } catch (err) {
        if (cancelled) return;
        setConnected(false);
        if (err instanceof RpcError) {
          setError(`RPC error: ${err.message}`);
        } else if (err instanceof Error) {
          setError(`Connection error: ${err.message}`);
        } else {
          setError("Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, pageSize]);

  return (
    <GlassCard>
      <div className="p-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {tokens.length > 0 && (
            <>Showing {offset + 1}–{offset + tokens.length}</>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOffset(Math.max(0, offset - pageSize))}
            disabled={offset === 0 || loading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOffset(offset + pageSize)}
            disabled={tokens.length < pageSize || loading}
          >
            Next
          </Button>
        </div>
      </div>

      <hr />

      <div className="p-4">
        {error ? (
          <div className="text-destructive text-sm">{error}</div>
        ) : loading && tokens.length === 0 ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead className="text-right">Decimals</TableHead>
                <TableHead className="text-right">Max Supply</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {tokens.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No tokens
                  </TableCell>
                </TableRow>
              )}

              {tokens.map((t) => {
                const isNative = t.is_native;
                const tokenIdDecimal = isNative
                  ? "0"
                  : BigInt(t.id).toString();
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/search/tokens/${tokenIdDecimal}`}
                        className="hover:underline"
                      >
                        {isNative ? "0 (native)" : formatCount(t.id)}
                      </Link>
                    </TableCell>
                    <TableCell>{t.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {t.symbol}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {t.creator ? (
                        <Link
                          href={`/search/address/${t.creator}`}
                          className="hover:underline"
                        >
                          {shortAddress(t.creator)}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.decimals}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {BigInt(t.max_supply) === BigInt(0)
                        ? "Unlimited"
                        : formatClrty(t.max_supply)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </GlassCard>
  );
};

export default TokensList;