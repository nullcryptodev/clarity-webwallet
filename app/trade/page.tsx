"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { SwapTab } from "../../components/trade/swap-tab";
import { PoolTab } from "../../components/trade/pool-tab";
import { LimitTab } from "../../components/trade/limit-tab";
import { PairSelector } from "../../components/trade/pair-selector";
import { Coins, Droplets, ImageIcon, LineChart, Repeat } from "lucide-react";
import PageHeading from "@/components/PageHeading";
import { useTokenInfo } from "@/lib/hooks";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { cn } from "cn";

/**
 * The pair the user is trading. Each side is independently
 * nullable so the type can represent the intermediate state
 * between the user's first and second click.
 */
export interface Pair {
  base: bigint;
  quote: bigint;
}

export default function TradePage() {
  const [pair, setPair] = useState<Pair>({ base: 0n, quote: 1n });
  const [tab, setTab] = useState<"swap" | "pool" | "limit">("swap");

  const baseInfo = useTokenInfo(pair.base);
  const quoteInfo = useTokenInfo(pair.quote);

  const baseSymbol = baseInfo.data?.symbol ?? `#${pair.base}`;
  const quoteSymbol = quoteInfo.data?.symbol ?? `#${pair.quote}`;

  // Both sides must be set for the tabs to render.
  const pairReady = pair.base !== null && pair.quote !== null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeading
        go_back_url="/wallet"
        title="Trade"
        subtitle="Swap tokens, provide liquidity, or place a limit order."
      />

      <GlassCard className="mb-6 lg:mx-auto lg:w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Pair</CardTitle>
          <CardDescription>
            Choose what you want to trade against what. The tabs below use
            this pair.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PairSelector value={pair} onChange={setPair} />

          {
            /*
          <div className="mb-6">
            <TokenPriceChart
              pair={pair}
              baseSymbol={baseSymbol}
              quoteSymbol={quoteSymbol}
            />
          </div>
            */
          }
        </CardContent>
      </GlassCard>

      {!pairReady && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {pair.base === null && pair.quote === null
              ? "Select a base and a quote to begin."
              : pair.base === null
                ? "Select a base token."
                : "Select a quote token."}
          </CardContent>
        </Card>
      )}

      {pairReady && pair.base !== null && pair.quote !== null && (
        <div>
          <div className="grid w-full grid-cols-3 gap-2 lg:w-3/4 lg:mx-auto">
            <GlassButton
              variant="solid"
              className={cn(
                tab == 'swap' ? 'opacity-100 duration-150' : 'opacity-50 hover:opacity-80 duration-150',
              )}
              onClick={() => setTab('swap')}
            >
              <Repeat className="mr-2 h-4 w-4" />
              Swap
            </GlassButton>

            <GlassButton
              variant="solid"
              className={cn(
                tab == 'pool' ? 'opacity-100 duration-150' : 'opacity-50 hover:opacity-80 duration-150',
              )}
              onClick={() => setTab('pool')}
            >
              <Droplets className="mr-2 h-4 w-4" />
              Pool
            </GlassButton>

            <GlassButton
              variant="solid"
              className={cn(
                tab == 'limit' ? 'opacity-100 duration-150' : 'opacity-50 hover:opacity-80 duration-150',
              )}
              onClick={() => setTab('limit')}
            >
              <LineChart className="mr-2 h-4 w-4" />
              Limit
            </GlassButton>
          </div>

          {tab == 'swap' && (
            <div className="pt-6">
              <SwapTab pair={{ base: pair.base, quote: pair.quote }} />
            </div>
          )}

          {tab == 'pool' && (
            <div className="pt-6">
              <PoolTab pair={{ base: pair.base, quote: pair.quote }} />
            </div>
          )}

          {tab == 'limit' && (
            <div className="pt-6">
              <LimitTab pair={{ base: pair.base, quote: pair.quote }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}