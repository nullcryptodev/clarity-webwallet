import { ErrorNote } from "@/components/ErrorNote";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { currentNonce, TX_CONSTANTS, useSubmitTx } from "@/lib/use-submit-tx";
import { validateName, validateRoyalty, validateSymbol } from "@/lib/validate";
import { useWallet } from "@/lib/wallet";
import { hexToBigInt, TxBuilder } from "@claritychain/rpc";
import { Pencil } from "lucide-react";
import { FC, useMemo, useState } from "react";

type props = {
  token: import("@claritychain/rpc").TokenInfo;
}

const Edit: FC <props> = ({
  token,
}) => {
  const wallet = useWallet();
  const { submit, submitting, error, clearError } = useSubmitTx();

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [royalty, setRoyalty] = useState("");

  // The builder's convention is "empty string = no change". The
  // form reflects that: leaving a field blank preserves the
  // current value, and the placeholder shows what "no change"
  // would leave in place.
  const nameError = useMemo(
    () => (name.length > 0 ? validateName(name) : null),
    [name],
  );
  const symbolError = useMemo(
    () => (symbol.length > 0 ? validateSymbol(symbol) : null),
    [symbol],
  );
  const royaltyError = useMemo(
    () => (royalty.length > 0 ? validateRoyalty(royalty) : null),
    [royalty],
  );

  const anythingChanged =
    name.length > 0 || symbol.length > 0 || royalty.length > 0;

  const canSubmit =
    wallet.address !== null &&
    anythingChanged &&
    nameError === null &&
    symbolError === null &&
    royaltyError === null &&
    !submitting;

  const onEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const from = wallet.address;
    if (!from) return;

    try {
      const nonce = await currentNonce(from);
      const unsigned = TxBuilder.updateTokenMeta({
        from,
        fee: TX_CONSTANTS.fee,
        nonce,
        chainId: TX_CONSTANTS.chainId,
        tokenId: hexToBigInt(token.id),
        // Empty string = no change, per the builder's contract.
        newName: name.length > 0 ? name.trim() : undefined,
        newSymbol: symbol.length > 0 ? symbol.trim().toUpperCase() : undefined,
        // 0 = no change, per the builder's contract.
        newRoyaltyBps: royalty.length > 0 ? Number(royalty) : undefined,
      });
      await submit(unsigned, true);
      setName("");
      setSymbol("");
      setRoyalty("");
    } catch {
      // submit() already set the error.
    }
  };

  return (
    <Card>
      <CardHeader>
        <Pencil className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="mt-2 text-lg">Edit metadata</CardTitle>
        <CardDescription>
          Change the name, symbol, or royalty. Leave a field blank to keep
          its current value. Max supply cannot be changed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onEdit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={token.name}
              maxLength={64}
              disabled={submitting}
            />
            {nameError && (
              <p className="mt-1 text-xs text-destructive">{nameError}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Symbol
            </label>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder={token.symbol}
              maxLength={8}
              disabled={submitting}
              className="font-mono"
            />
            {symbolError && (
              <p className="mt-1 text-xs text-destructive">{symbolError}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Royalty (bps)
            </label>
            <Input
              value={royalty}
              onChange={(e) =>
                setRoyalty(e.target.value.replace(/\D/g, ""))
              }
              placeholder={String(token.royalty_bps)}
              inputMode="numeric"
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Current: {(token.royalty_bps / 100).toFixed(2)}%. 100 bps =
              1%. Max 10000.
            </p>
            {royaltyError && (
              <p className="mt-1 text-xs text-destructive">{royaltyError}</p>
            )}
          </div>

          {error && <ErrorNote message={error} />}

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? "Updating…" : "Update metadata"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default Edit;