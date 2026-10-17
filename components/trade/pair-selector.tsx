"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAllTokens } from "@/lib/hooks";
import { hexToBigInt } from "@claritychain/rpc";
import type { TokenInfo } from "@claritychain/rpc";
import { ArrowDownUp, Check, ChevronDown, Coins } from "lucide-react";
import type { Pair } from "../../app/trade/page";
import { GlassPopover, GlassPopoverContent, GlassPopoverTrigger } from "../GlassPopover";
import { GlassInput } from "../GlassInput";

const NATIVE = 0n;

export function PairSelector({
  value,
  onChange,
}: {
  value: Pair;
  onChange: (pair: Pair) => void;
}) {
  const tokens = useAllTokens(200, 0);
  const all = tokens.data?.tokens ?? [];

  const clrtyStandIn: TokenInfo = useMemo(
    () => ({
      id: "0x0",
      name: "Clarity",
      symbol: "CLRTY",
      decimals: 18,
      creator: null,
      backing: "unbacked",
      backing_code: 0,
      max_supply: "0x0",
      royalty_bps: 0,
      fingerprint: null,
      is_native: true,
      is_bridged: false,
    }),
    [],
  );

  const options = useMemo(() => {
    const seen = new Set<string>();
    const out: TokenInfo[] = [];

    const hasNativeFromRpc = all.some(
      (t) => t.is_native || hexToBigInt(t.id) === NATIVE,
    );

    const nativeEntry = hasNativeFromRpc
      ? all.find((t) => t.is_native || hexToBigInt(t.id) === NATIVE)!
      : clrtyStandIn;
    out.push(nativeEntry);
    seen.add(nativeEntry.id);

    for (const t of all) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      out.push(t);
    }

    return out;
  }, [all, clrtyStandIn]);

  const base =
    value.base !== null
      ? options.find((t) => hexToBigInt(t.id) === value.base)
      : undefined;
  const quote =
    value.quote !== null
      ? options.find((t) => hexToBigInt(t.id) === value.quote)
      : undefined;

  const setBase = (t: TokenInfo) => {
    const id = hexToBigInt(t.id);
    // Refuse to pick the same token on both sides.
    if (value.quote !== null && value.quote === id) return;
    onChange({ ...value, base: id });
  };

  const setQuote = (t: TokenInfo) => {
    const id = hexToBigInt(t.id);
    if (value.base !== null && value.base === id) return;
    onChange({ ...value, quote: id });
  };

  const reverse = () => {
    // Reverse only makes sense when both sides are set.
    if (value.base === null || value.quote === null) return;
    onChange({ base: value.quote, quote: value.base });
  };

  const canReverse = value.base !== null && value.quote !== null;

  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
      <TokenField
        label="Base"
        token={base}
        options={options}
        onSelect={setBase}
        exclude={value.quote ?? undefined}
      />

      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={reverse}
        disabled={!canReverse}
        className="self-center rotate-90 mt-4"
        title="Reverse pair"
      >
        <ArrowDownUp />
      </Button>

      <TokenField
        label="Quote"
        token={quote}
        options={options}
        onSelect={setQuote}
        exclude={value.base ?? undefined}
      />
    </div>
  );
}

function TokenField({
  label,
  token,
  options,
  onSelect,
  exclude,
}: {
  label: string;
  token: TokenInfo | undefined;
  options: TokenInfo[];
  onSelect: (t: TokenInfo) => void;
  exclude?: bigint;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const filtered = options.filter((t) => {
    const id = hexToBigInt(t.id);
    if (exclude !== undefined && id === exclude) return false;
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.symbol.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1">
      <label className="mb-1 block text-xs text-muted-foreground">
        {label}
      </label>
      <GlassPopover open={open} onOpenChange={setOpen}>
        <GlassPopoverTrigger
          className="inline-flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm font-normal shadow-xs hover:bg-accent/40 hover:text-accent-foreground"
        >
          {token ? (
            <span className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{token.symbol}</span>
              <span className="font-mono text-xs text-muted-foreground">
                #{hexToBigInt(token.id).toString()}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select a token</span>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </GlassPopoverTrigger>
        <GlassPopoverContent
          className="w-[var(--popover-trigger-width)] p-3 lg:w-xs"
          align="start"
        >
          <div className="border-b p-2">
            <GlassInput
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter tokens"
              className="h-8 mb-2"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">
                No tokens match.
              </li>
            )}
            {filtered.map((t) => {
              const isSelected = token?.id === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(t);
                      setOpen(false);
                      setFilter("");
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/60 rounded-xl"
                  >
                    <span className="flex items-center gap-2">
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <span className="h-3.5 w-3.5" />
                      )}
                      <span className="font-medium">{t.symbol}</span>
                      <span className="text-xs text-muted-foreground">
                        {t.name}
                      </span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      #{hexToBigInt(t.id).toString()}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </GlassPopoverContent>
      </GlassPopover>
    </div>
  );
}