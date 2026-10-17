import { ErrorNote } from "@/components/ErrorNote";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { currentNonce, TX_CONSTANTS, useSubmitTx } from "@/lib/use-submit-tx";
import { validateRewardAddress } from "@/lib/validate";
import { useWallet } from "@/lib/wallet";
import { TxBuilder, Validator } from "@claritychain/rpc";
import { Coins } from "lucide-react";
import { FC, useMemo, useState } from "react";

type props = {
  validator: Validator;
}

const UpdateRewardAddress: FC <props> = ({ validator }) => {
  const wallet = useWallet();
  const { submit, submitting, error, clearError } = useSubmitTx();
  const [newAddress, setNewAddress] = useState("");

  const addressError = useMemo(
    () => validateRewardAddress(newAddress),
    [newAddress],
  );

  const canSubmit =
    wallet.address !== null &&
    newAddress.length > 0 &&
    addressError === null &&
    newAddress !== validator.reward_address &&
    !submitting;

  const onUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const from = wallet.address;
    if (!from) return;

    try {
      const nonce = await currentNonce(from);
      const unsigned = TxBuilder.updateRewardAddress({
        from,
        fee: TX_CONSTANTS.fee,
        nonce,
        chainId: TX_CONSTANTS.chainId,
        newRewardAddress: newAddress,
      });
      await submit(unsigned, true);
      setNewAddress("");
    } catch {
      // submit() already set the error.
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Coins className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">Update reward address</CardTitle>
            <CardDescription>
              Block rewards are paid to this address. Changing it does
              not affect your signing key or your stake.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onUpdate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Current reward address
            </label>
            <div className="break-all rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
              {validator.reward_address}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              New reward address
            </label>
            <Input
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value.trim())}
              placeholder="clrty1… / tclrty1… / rclrty1…"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="font-mono text-sm"
              disabled={submitting}
            />
            {newAddress.length > 0 && addressError && (
              <p className="mt-1 text-xs text-destructive">
                {addressError}
              </p>
            )}
          </div>

          {error && <ErrorNote message={error} />}

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? "Updating…" : "Update reward address"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default UpdateRewardAddress;