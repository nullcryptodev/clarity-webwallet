import { currentNonce, TX_CONSTANTS, useSubmitTx } from "@/lib/use-submit-tx";
import { useWallet } from "@/lib/wallet";
import { Account, bigIntToHex, formatClrty, hexToBigInt, TxBuilder } from "@claritychain/rpc";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { AlertTriangle, Sprout } from "lucide-react";
import Stat from "../Stat";
import { Button } from "../ui/button";
import { GlassCard } from "../GlassCard";


function YourStake({
  account,
  loading,
}: {
  account: Account | null;
  loading: boolean;
}) {
  const wallet = useWallet();
  const { submit, submitting, error, clearError, setError } = useSubmitTx();
  const [action, setAction] = useState<"opt_in" | "opt_out" | "claim" | null>(
    null,
  );

  if (!wallet.address) return null;

  // The three actions share one pipeline. Each builds a different
  // transaction with the wallet's address, the current nonce, and
  // the default fee, then runs it through submit().

  const from = wallet.address;
  if (!from) return null;

  const onAction = async (kind: "opt_in" | "opt_out" | "claim") => {
    setAction(kind);
    clearError();
    try {
      const nonce = await currentNonce(from);
      const base = {
        from,
        fee: TX_CONSTANTS.fee,
        nonce,
        chainId: TX_CONSTANTS.chainId,
      };
      let unsigned;
      switch (kind) {
        case "opt_in":
          unsigned = TxBuilder.optInStaking(base);
          break;
        case "opt_out":
          unsigned = TxBuilder.optOutStaking(base);
          break;
        case "claim":
          unsigned = TxBuilder.claimRewards(base);
          break;
      }
      await submit(unsigned, true);
    } catch {
      // submit() already set the error; nothing to add.
    } finally {
      setAction(null);
    }
  };

  const staked = account ? hexToBigInt(account.staked) : 0n;
  const pending = account ? hexToBigInt(account.pending_rewards) : 0n;
  const optedOut = account?.staking_opted_out ?? false;
  const stakerSince = account?.staker_since_height
    ? hexToBigInt(account.staker_since_height)
    : 0n;

  return (
    <GlassCard>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Sprout className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">Your stake</CardTitle>
            <CardDescription>
              {optedOut
                ? "Auto-staking is off. Your balance is not earning rewards."
                : stakerSince > 0n
                  ? `Staking since block #${stakerSince.toString()}.`
                  : "You are not staking yet."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 mt-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <Stat
            label="Staked"
            value={
              loading && !account
                ? "…"
                : `${formatClrty(bigIntToHex(staked))} CLRTY`
            }
          />
          <Stat
            label="Pending rewards"
            value={
              loading && !account
                ? "…"
                : `${formatClrty(bigIntToHex(pending))} CLRTY`
            }
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {!optedOut ? (
            <Button
              variant="outline"
              onClick={() => onAction("opt_out")}
              disabled={submitting}
            >
              {action === "opt_out" ? "Submitting…" : "Opt out"}
            </Button>
          ) : (
            <Button
              onClick={() => onAction("opt_in")}
              disabled={submitting}
            >
              {action === "opt_in" ? "Submitting…" : "Opt in to staking"}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => onAction("claim")}
            disabled={submitting || pending === 0n}
          >
            {action === "claim"
              ? "Claiming…"
              : `Claim ${pending > 0n ? formatClrty(bigIntToHex(pending)) : "0"} CLRTY`}
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </CardContent>
    </GlassCard>
  );
}

export default YourStake;