"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/wallet";
import { useTokenInfo } from "@/lib/hooks";
import { ArrowLeft } from "lucide-react";
import InvalidPage from "@/components/tokens/InvalidPage";
import TokenHeader from "@/components/tokens/info/Header";
import TokenInformation from "@/components/tokens/info/Information";
import TokenHolders from "@/components/tokens/info/Holders";
import TokenRecentTransactions from "@/components/tokens/info/RecentTransactions";
import NotLoaded from "@/components/layout/Session/NotLoaded";
import Locked from "@/components/layout/Session/Locked";

export default function TokenDetailPage() {
  const params = useParams<{ id: string }>();

  // The route param is the token id as a decimal string, matching
  // what the list page links to. Convert once, at the top.
  const tokenId = useMemo(() => {
    try {
      return BigInt(params.id);
    } catch {
      return null;
    }
  }, [params.id]);

  const token = useTokenInfo(tokenId);
  const wallet = useWallet();

  return (
    <div>
      {!wallet.isLoaded && <NotLoaded />}
      {wallet.isLoaded && !wallet.isUnlocked && <Locked />}
      {(tokenId === null || !token.loading && !token.data) ?
        <InvalidPage/>
        :
        token.loading && !token.data ? 
        <div className="mx-auto max-w-4xl px-6 py-12">
          <p className="text-muted-foreground">Loading token…</p>
        </div>
        :
          <div className="p-6">
            <div className="flex items-center gap-4 pb-4">
              <Link href={'/tokens'}>
                <Button variant={'outline'} size={'icon-sm'}>
                  <ArrowLeft />
                </Button>
              </Link>
              <h1 className="text-xl font-semibold">All Tokens</h1>
            </div>
            
            <TokenHeader
              token={token.data!}
              tokenId={tokenId}
            />

          <div className="grid gap-6 lg:grid-cols-3">
            <TokenInformation token={token.data!}/>
            <TokenHolders token={token.data!} tokenId={tokenId} />
            <TokenRecentTransactions token={token.data!} tokenId={tokenId}/>
          </div>
        </div>
      }
    </div>
  );
}