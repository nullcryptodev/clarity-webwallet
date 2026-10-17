import { ErrorNote } from "@/components/ErrorNote";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { currentNonce, TX_CONSTANTS, useSubmitTx } from "@/lib/use-submit-tx";
import { parseAmount } from "@/lib/utils";
import { validateBurnAmount } from "@/lib/validate";
import { useWallet } from "@/lib/wallet";
import { formatTokenAmount, hexToBigInt, TxBuilder } from "@claritychain/rpc";
import { Flame } from "lucide-react";
import { FC, useMemo, useState } from "react";

type props = {
  token: import("@claritychain/rpc").TokenInfo;
  balance: bigint;
}

const Burn: FC <props> = ({
  token, balance,
}) => {
  const wallet = useWallet();
  const { submit, submitting, error, clearError } = useSubmitTx();

  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const amountError = useMemo(
    () => validateBurnAmount(amount, token, balance),
    [amount, token, balance],
  );

  const canSubmit =
    wallet.address !== null &&
    amount.length > 0 &&
    amountError === null &&
    confirmed &&
    !submitting;

  const onBurn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const from = wallet.address;
    if (!from) return;
    const a = parseAmount(amount, token.decimals);
    if (a === null) return;

    try {
      const nonce = await currentNonce(from);
      const unsigned = TxBuilder.burnToken({
        from,
        fee: TX_CONSTANTS.fee,
        nonce,
        chainId: TX_CONSTANTS.chainId,
        tokenId: hexToBigInt(token.id),
        amount: a,
      });
      await submit(unsigned, true);
      setAmount("");
      setConfirmed(false);
    } catch {
      // submit() already set the error.
    }
  };

  return (
    <Card>
      <CardHeader>
        <Flame className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="mt-2 text-lg">Burn</CardTitle>
        <CardDescription>
          Permanently destroy tokens from your own balance. Burned tokens
          cannot be recovered.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onBurn} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Amount to burn ({token.symbol})
            </label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              inputMode="decimal"
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Your balance:{" "}
              {formatTokenAmount(balance, token.decimals)} {token.symbol}
            </p>
            {amount.length > 0 && amountError && (
              <p className="mt-1 text-xs text-destructive">{amountError}</p>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={submitting}
              className="mt-1"
            />
            <span className="text-muted-foreground">
              I understand this is irreversible and the burned tokens
              cannot be recovered.
            </span>
          </label>

          {error && <ErrorNote message={error} />}

          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={!canSubmit}
          >
            {submitting ? "Burning…" : "Burn"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default Burn;