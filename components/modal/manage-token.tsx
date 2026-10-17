"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/wallet";
import {
  useTokenInfo,
  useTokenSupply,
  useBalance,
} from "@/lib/hooks";
import {
  formatTokenAmount,
  shortAddress,
} from "@claritychain/rpc";
import type { TokenInfo } from "@claritychain/rpc";
import { AlertTriangle, Coins, Flame, Pencil, Sparkles } from "lucide-react";
import Header from "@/components/tokens/manage/Header";
import Stat from "@/components/Stat";
import Mint from "@/components/tokens/manage/Mint";
import Burn from "@/components/tokens/manage/Burn";
import Edit from "@/components/tokens/manage/Edit";

type props = {
  /** The token to manage. Must be a valid id — the caller resolves it. */
  tokenId: bigint | null;
  /** Controlled open state. */
  open: boolean;
  /** Controlled open-state setter. */
  onOpenChange: (open: boolean) => void;
};

export function ManageTokenModal({ tokenId, open, onOpenChange }: props) {
  const wallet = useWallet();
  const token = useTokenInfo(tokenId);
  const supply = useTokenSupply(tokenId);
  const balance = useBalance(wallet.address, tokenId);
  const [tab, setTab] = useState<"mint" | "burn" | "edit">("mint");

  //  The modal assumes it's opened with a valid, resolved token id.
  //  A null id is a programming error at the call site, not a user
  //  flow — the caller should have resolved it before opening.
  const t = token.data;

  const isCreator =
    !!t &&
    !!wallet.address &&
    t.creator !== null &&
    t.creator === wallet.address;

  const ready =
    wallet.isUnlocked && wallet.address !== null && t !== undefined && isCreator;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {!ready ? (
          <NotManageable
            token={t ?? null}
            address={wallet.address}
            tokenId={tokenId}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <>
            <Header token={t!} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Stat
                label="Your balance"
                value={
                  balance.loading && balance.data === null
                    ? "…"
                    : `${formatTokenAmount(balance.data ?? 0n, t!.decimals)} ${t!.symbol}`
                }
              />
              <Stat
                label="Current supply"
                value={
                  supply.loading && !supply.data
                    ? "…"
                    : supply.data
                      ? `${formatTokenAmount(BigInt(supply.data.supply), t!.decimals)} ${t!.symbol}`
                      : "—"
                }
              />
            </div>

            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as "mint" | "burn" | "edit")}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="mint">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Mint
                </TabsTrigger>
                <TabsTrigger value="burn">
                  <Flame className="mr-2 h-4 w-4" />
                  Burn
                </TabsTrigger>
                <TabsTrigger value="edit">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </TabsTrigger>
              </TabsList>

              <TabsContent value="mint" className="pt-4">
                <Mint token={t!} />
              </TabsContent>

              <TabsContent value="burn" className="pt-4">
                <Burn token={t!} balance={balance.data ?? 0n} />
              </TabsContent>

              <TabsContent value="edit" className="pt-4">
                <Edit token={t!} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ================================================================
// Not-manageable fallback
// ================================================================

/**
 * What the modal shows when it can't render the manage tabs.
 *
 * Three failure modes, distinguished by what's missing:
 *
 *   - No wallet loaded / unlocked  → "unlock a wallet"
 *   - Token id is null or not found → "invalid token"
 *   - Wallet isn't the creator     → "not yours"
 *
 * The modal is a controlled child, so it can't offer the
 * create/import flows a page would; it just explains the state
 * and offers the one link that resolves it.
 */
function NotManageable({
  token,
  address,
  tokenId,
  onClose,
}: {
  token: TokenInfo | null;
  address: string | null;
  tokenId: bigint | null;
  onClose: () => void;
}) {
  //  Token id is null: the caller passed a bad value.
  if (tokenId === null) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Invalid token
          </DialogTitle>
          <DialogDescription>
            The token id passed to the manage modal is not valid.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-4">
          <Link href="/tokens" onClick={onClose}>
            <Button variant="outline">Back to tokens</Button>
          </Link>
        </div>
      </>
    );
  }

  //  Token record hasn't loaded yet.
  if (token === null) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Loading token…</DialogTitle>
        </DialogHeader>
        <p className="pt-4 text-sm text-muted-foreground">
          Fetching token #{tokenId.toString()} from the node.
        </p>
      </>
    );
  }

  //  No wallet unlocked.
  if (address === null) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-muted-foreground" />
            Unlock a wallet
          </DialogTitle>
          <DialogDescription>
            Managing a token requires an unlocked wallet that is the
            token&apos;s creator.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-4">
          <Link href="/wallet" onClick={onClose}>
            <Button>Go to wallet</Button>
          </Link>
        </div>
      </>
    );
  }

  //  Wallet is unlocked but isn't the creator.
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          This isn&apos;t your token
        </DialogTitle>
        <DialogDescription>
          Minting, burning, and editing metadata are restricted to the
          token&apos;s creator. The creator address is{" "}
          <span className="font-mono text-xs">
            {token.creator ? shortAddress(token.creator) : "unknown"}
          </span>
          , and the connected wallet is{" "}
          <span className="font-mono text-xs">{shortAddress(address)}</span>.
        </DialogDescription>
      </DialogHeader>
      <div className="flex gap-2 pt-4">
        <Link href={`/search/tokens/${token.id}`} onClick={onClose}>
          <Button variant="outline">View the token instead</Button>
        </Link>
      </div>
    </>
  );
}