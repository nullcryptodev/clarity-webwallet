import Link from "next/link";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import TokensTable from "../TokensTable";
import { useAllTokens } from "@/lib/hooks";
import { useState } from "react";
import { GlassCard } from "../GlassCard";

function AllTokens() {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");
  const pageSize = 25;

  const result = useAllTokens(pageSize, page * pageSize);
  const tokens = result.data?.tokens ?? [];

  // Filter is client-side on the current page. The RPC surface
  // has no "tokens by name/symbol" query, so the filter only sees
  // the current page. That's a known limitation; a server-side
  // search would need a new RPC method.
  const filtered = filter
    ? tokens.filter((t) => {
      const q = filter.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    })
    : tokens;

  return (
    <GlassCard>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">All tokens</CardTitle>
            <CardDescription>
              Every token on the chain, newest first.
            </CardDescription>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name, symbol, or id"
              className="w-64 pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {result.loading && tokens.length === 0 && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {!result.loading && tokens.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            No tokens on this chain yet.
          </p>
        )}
        {filtered.length > 0 && <TokensTable tokens={filtered} />}
        {filter && filtered.length === 0 && tokens.length > 0 && (
          <p className="text-sm text-muted-foreground">
            No tokens on this page match "{filter}".
          </p>
        )}

        {tokens.length === pageSize && (
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1}
            </span>
            <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </GlassCard>
  );
}

export default AllTokens;