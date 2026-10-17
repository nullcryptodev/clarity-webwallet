import Field from "@/components/Field";
import { GlassButton } from "@/components/GlassButton";
import { GlassDialogDescription, GlassDialogHeader, GlassDialogTitle } from "@/components/GlassDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentNonce, TX_CONSTANTS, useSubmitTx } from "@/lib/use-submit-tx";
import { parseIntegerAmount } from "@/lib/utils";
import { validateDecimals, validateMaxSupply, validateName, validateRoyalty, validateSymbol } from "@/lib/validate";
import { useWallet } from "@/lib/wallet";
import { TxBuilder } from "@claritychain/rpc";
import { cn } from "cn/vite";
import { AlertTriangle, ArrowRight, Coins } from "lucide-react";
import { useMemo, useState } from "react";

function CreateForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => void;
}) {
  const wallet = useWallet();
  type SupplyMode = "unlimited" | "capped";

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [maxSupplyMode, setMaxSupplyMode] = useState<SupplyMode>("unlimited");
  const [maxSupply, setMaxSupply] = useState("");
  const [royaltyBps, setRoyaltyBps] = useState("0");

  const { submit, submitting, error, clearError } = useSubmitTx();

  const nameError = useMemo(() => validateName(name), [name]);
  const symbolError = useMemo(() => validateSymbol(symbol), [symbol]);
  const decimalsError = useMemo(
    () => validateDecimals(decimals),
    [decimals],
  );
  const maxSupplyError = useMemo(
    () =>
      maxSupplyMode === "unlimited"
        ? null
        : validateMaxSupply(maxSupply),
    [maxSupplyMode, maxSupply],
  );
  const royaltyError = useMemo(
    () => validateRoyalty(royaltyBps),
    [royaltyBps],
  );

  const canSubmit =
    nameError === null &&
    symbolError === null &&
    decimalsError === null &&
    maxSupplyError === null &&
    royaltyError === null &&
    !submitting;

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const from = wallet.address;
    if (!from) return;

    try {
      const nonce = await currentNonce(from);
      const base = {
        from,
        fee: TX_CONSTANTS.fee,
        nonce,
        chainId: TX_CONSTANTS.chainId,
      };

      const unsigned = TxBuilder.createToken({
        ...base,
        name: name.trim(),
        symbol: symbol.trim(),
        decimals: Number(decimals),
        backing: 0,
        maxSupply:
          maxSupplyMode === "unlimited"
            ? 0n
            : parseIntegerAmount(maxSupply),
        royaltyBps: Number(royaltyBps),
        // fingerprint is optional; omit it for user-created
        // tokens. It exists for bridged assets whose 32-byte
        // content hash links back to the source chain.
      });

      await submit(unsigned, true);
      onCreated();
    } catch {
      // submit() already set the error.
    }
  };

  return (
    <>
      <GlassDialogHeader>
        <GlassDialogTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-muted-foreground" />
          Create a token
        </GlassDialogTitle>
        <GlassDialogDescription>
          Every field except royalty and max supply can be set once and
          never changed. Choose carefully.
        </GlassDialogDescription>
      </GlassDialogHeader>

      {/*
        The form scrolls inside a fixed-height region. The
        DialogHeader above is outside the scroll region, so the
        title stays pinned while the fields move. On a laptop this
        is where the form lives; on a phone the dialog takes the
        full height and the scroll region is smaller.

        max-h-[70vh] rather than 85vh so the dialog's own close
        button and any focus ring has room above and below. If
        the form is shorter than the max, it doesn't scroll.
      */}
      <form onSubmit={onCreate} className="max-h-[70vh] space-y-5 overflow-y-auto px-1">
        <Field
          label="Name"
          hint="The full name. Shown in wallets and explorers."
          error={nameError}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Token"
            maxLength={64}
            disabled={submitting}
          />
        </Field>

        <Field
          label="Symbol"
          hint="A short ticker, 2–8 characters."
          error={symbolError}
        >
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="MYT"
            maxLength={8}
            disabled={submitting}
            className="font-mono"
          />
        </Field>

        <Field
          label="Decimals"
          hint="How many decimal places the token supports. 18 matches CLRTY; 0 makes it indivisible."
          error={decimalsError}
        >
          <Input
            value={decimals}
            onChange={(e) => setDecimals(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="18"
            disabled={submitting}
          />
        </Field>

        <Field label="Max supply">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <GlassButton
                type="button"
                onClick={() => setMaxSupplyMode("unlimited")}
                className={`${maxSupplyMode == "unlimited" ? "opacity-100" : "opacity-50"}`}
                disabled={submitting}
                variant="solid"
              >
                Unlimited
              </GlassButton>
              <GlassButton
                type="button"
                onClick={() => setMaxSupplyMode("capped")}
                className={`${maxSupplyMode == "capped" ? "opacity-100" : "opacity-50"}`}
                disabled={submitting}
                variant="solid"
              >
                Capped
              </GlassButton>
            </div>

            {maxSupplyMode === "capped" && (
              <Input
                value={maxSupply}
                onChange={(e) =>
                  setMaxSupply(e.target.value.replace(/\D/g, ""))
                }
                inputMode="numeric"
                placeholder="1000000"
                disabled={submitting}
                className="mt-2"
              />
            )}
          </div>
        </Field>

        <Field
          label="Royalty"
          hint="Basis points paid to the creator on each DEX trade. 100 bps = 1%. Max 10000 (100%)."
          error={royaltyError}
        >
          <Input
            value={royaltyBps}
            onChange={(e) =>
              setRoyaltyBps(e.target.value.replace(/\D/g, ""))
            }
            inputMode="numeric"
            placeholder="0"
            disabled={submitting}
          />
        </Field>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/*
          The action row is sticky at the bottom of the scroll
          region so Create and Cancel are always reachable
          without scrolling past the last field. `sticky bottom-0`
          with a background matches the dialog's surface and a
          top border separates it from the scrolling content.
        */}
        <div className="sticky -mx-1 flex gap-2 border-t px-1 pt-4">
          <Button type="submit" className="flex-1" disabled={!canSubmit} variant="outline">
            {submitting ? "Creating…" : "Create token"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}

export default CreateForm;