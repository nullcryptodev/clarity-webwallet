import { useWallet } from "@/lib/wallet";
import { bigIntToHex, formatClrty, hexToBigInt, TxBuilder, UNBONDING_PERIOD, Validator } from "@claritychain/rpc";
import { FC, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { currentNonce, TX_CONSTANTS, useSubmitTx } from "@/lib/use-submit-tx";
import { AlertTriangle, Unlock } from "lucide-react";
import { ErrorNote } from "@/components/ErrorNote";
import { Button } from "@/components/ui/button";



type props = {
  validator: Validator;
}

const Unregister: FC <props> = ({ validator }) => {
  const wallet = useWallet();
  const { submit, submitting, error, clearError } = useSubmitTx();
  const [confirmed, setConfirmed] = useState(false);

  const isSeed = validator.is_seed;
  const stake = hexToBigInt(validator.stake);

  const canSubmit =
    wallet.address !== null && !isSeed && confirmed && !submitting;

  const onUnregister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const from = wallet.address;
    if (!from) return;

    try {
      const nonce = await currentNonce(from);
      const unsigned = TxBuilder.unregisterValidator({
        from,
        fee: TX_CONSTANTS.fee,
        nonce,
        chainId: TX_CONSTANTS.chainId,
      });
      await submit(unsigned, true);
    } catch {
      // submit() already set the error.
    }
  };

  return (
    <Card className="border-yellow-500/40">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Unlock className="h-5 w-5 text-yellow-500" />
          <div>
            <CardTitle className="text-lg">Unregister</CardTitle>
            <CardDescription>
              Leaving the validator set is a two-step process. Your
              validator leaves the active set immediately, and your
              stake is released after the unbonding period.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="font-medium">What happens when you unregister</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
            <li>
              Your validator leaves the active set at the next
              rotation. You stop producing blocks and earning rewards.
            </li>
            <li>
              Your stake of{" "}
              <strong>{formatClrty(bigIntToHex(stake))} CLRTY</strong>{" "}
              remains locked for {UNBONDING_PERIOD} blocks.
            </li>
            <li>
              During the unbonding window, your record and signing key
              remain slashable if equivocation evidence surfaces. This
              is the entire reason for the delay.
            </li>
            <li>
              After {UNBONDING_PERIOD} blocks, your stake is released
              to your reward address and the validator record is
              deleted.
            </li>
          </ul>
        </div>

        {isSeed && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/5 p-3 text-sm text-yellow-700 dark:text-yellow-500">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              This validator is a seed validator. Seed validators are
              the trust anchor for bootstrap and cannot be unregistered
              by any means.
            </span>
          </div>
        )}

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={submitting || isSeed}
            className="mt-1"
          />
          <span className="text-muted-foreground">
            I understand my validator will leave the active set and my
            stake will be locked for {UNBONDING_PERIOD} blocks.
          </span>
        </label>

        {error && <ErrorNote message={error} />}

        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={!canSubmit}
          onClick={onUnregister}
        >
          {submitting ? "Unregistering…" : "Unregister validator"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default Unregister;