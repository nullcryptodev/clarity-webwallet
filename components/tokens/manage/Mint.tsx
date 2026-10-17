import { ErrorNote } from "@/components/ErrorNote";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { currentNonce, TX_CONSTANTS, useSubmitTx } from "@/lib/use-submit-tx";
import { parseAmount, supplyApprox } from "@/lib/utils";
import { validateMintAmount, validateRecipient } from "@/lib/validate";
import { useWallet } from "@/lib/wallet";
import { formatTokenAmount, hexToBigInt, TokenInfo, TxBuilder } from "@claritychain/rpc";
import { Sparkles } from "lucide-react";
import { FC, useMemo, useState } from "react";

type props = {
  token: TokenInfo;
}

const Mint: FC <props> = ({ token }) => {
  const wallet = useWallet();
  const { submit, submitting, error, clearError } = useSubmitTx();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  // Default the recipient to the creator's own address, since
  // that's the common case. The user can type a different one.
  const effectiveRecipient = recipient.length > 0 ? recipient : wallet.address ?? "";

  const recipientError = useMemo(
    () => validateRecipient(effectiveRecipient),
    [effectiveRecipient],
  );
  const amountError = useMemo(
    () => validateMintAmount(amount, token),
    [amount, token],
  );

  const canSubmit =
    wallet.address !== null &&
    effectiveRecipient.length > 0 &&
    recipientError === null &&
    amount.length > 0 &&
    amountError === null &&
    !submitting;

  const onMint = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const from = wallet.address;
    if (!from) return;
    const a = parseAmount(amount, token.decimals);
    if (a === null) return;

    try {
      const nonce = await currentNonce(from);
      const unsigned = TxBuilder.mintToken({
        from,
        fee: TX_CONSTANTS.fee,
        nonce,
        chainId: TX_CONSTANTS.chainId,
        tokenId: hexToBigInt(token.id),
        to: effectiveRecipient,
        amount: a,
      });
      await submit(unsigned, true);
      setAmount("");
    } catch {
      // submit() already set the error.
    }
  };

  const remaining =
    token.max_supply === "0x0"
      ? null
      : BigInt(token.max_supply) - supplyApprox(token);

  return (
    <Card>
      <CardHeader>
        <Sparkles className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="mt-2 text-lg">Mint</CardTitle>
        <CardDescription>
          Create new supply and send it to an address.
          {token.max_supply === "0x0" ? (
            <> This token has no supply cap.</>
          ) : (
            <>
              {" "}
              You can mint up to the cap.{" "}
              {remaining !== null && remaining >= 0n && (
                <>
                  Roughly{" "}
                  {formatTokenAmount(remaining, token.decimals)}{" "}
                  {token.symbol} remaining.
                </>
              )}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onMint} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Recipient
            </label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
              placeholder={wallet.address ?? "clrty1… / tclrty1… / rclrty1…"}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              disabled={submitting}
              className="font-mono text-sm"
            />
            {recipient.length > 0 && recipientError && (
              <p className="mt-1 text-xs text-destructive">
                {recipientError}
              </p>
            )}
            {recipient.length === 0 && wallet.address && (
              <p className="mt-1 text-xs text-muted-foreground">
                Leave blank to mint to your own address.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Amount ({token.symbol})
            </label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              inputMode="decimal"
              disabled={submitting}
            />
            {amount.length > 0 && amountError && (
              <p className="mt-1 text-xs text-destructive">{amountError}</p>
            )}
          </div>

          {error && <ErrorNote message={error} />}

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? "Minting…" : "Mint"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default Mint;