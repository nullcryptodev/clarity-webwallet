import { useAccount } from "@/lib/hooks";
import { useWallet } from "@/lib/wallet";
import { FC, useMemo, useState } from "react";
import { SendAsset, SendType } from "./types";
import { bigIntToHex, formatClrty, hexToBigInt, TxBuilder } from "@claritychain/rpc";
import { currentNonce, TX_CONSTANTS, useSubmitTx, type SubmitResult, } from "@/lib/use-submit-tx";
import { validateAmount as validateSendAmount, validateRecipient } from "@/lib/validate";
import { isAmountable, requireAmount } from "@/lib/utils";
import Confirmation from "./Confirmation";
import { GlassDialogDescription, GlassDialogHeader, GlassDialogTitle } from "@/components/GlassDialog";
import { AlertTriangle, ArrowRight, Send } from "lucide-react";
import AssetPicker from "./AssetPicker";
import { Input } from "@/components/ui/input";
import { GlassButton } from "@/components/GlassButton";

type props = {
  initialRecipient?: string;
  onClose: () => void;
}

const SendForm: FC <props> = ({
  initialRecipient, onClose,
}) => {
  const wallet = useWallet();
  const account = useAccount(wallet.address);

  const [asset, setAsset] = useState<SendAsset>({ kind: "clrty" });
  const [recipient, setRecipient] = useState(initialRecipient ?? "");
  const [amount, setAmount] = useState("");
  const [submitted, setSubmitted] = useState<SubmitResult | null>(null);
  const [view, setView] = useState<SendType>('native');

  const changeView = (swapViewTo: SendType) => {
    setView(swapViewTo);
  }

  const { submit, submitting, error, clearError } = useSubmitTx();

  const recipientError = useMemo(
    () => validateRecipient(recipient),
    [recipient],
  );
  const recipientValid = recipient.length > 0 && recipientError === null;

  const amountError = useMemo(
    () => validateSendAmount(asset, amount, account.data),
    [asset, amount, account.data],
  );
  const amountValid = isAmountable(asset)
    ? amount.length > 0 && amountError === null
    : true;

  const nftDisabled = asset.kind === "nft" || asset.kind === "nft-selecting";

  const assetChosen =
    asset.kind === "clrty" || asset.kind === "token" || asset.kind === "nft";

  const canSubmit =
    assetChosen &&
    recipientValid &&
    amountValid &&
    !nftDisabled &&
    !submitting &&
    !submitted;

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitted(null);

    if (asset.kind !== "clrty" && asset.kind !== "token") return;

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

      let unsigned;
      if (asset.kind === "clrty") {
        unsigned = TxBuilder.transfer({
          ...base,
          to: recipient,
          tokenId: 0n,
          amount: requireAmount((amount), 18),
        });
      } else {
        unsigned = TxBuilder.transfer({
          ...base,
          to: recipient,
          tokenId: asset.tokenId,
          amount: requireAmount(amount, asset.decimals),
        });
      }

      const result = await submit(unsigned, true);
      setSubmitted(result);
    } catch {
      // submit() already set the error.
    }
  };

  if (submitted) {
    return (
      <Confirmation
        result={submitted}
        asset={asset}
        recipient={recipient}
        onClose={onClose}
        onSendAnother={() => {
          setSubmitted(null);
          setAmount("");
          setRecipient("");
        }}
      />
    );
  }

  return (
    <>
      <GlassDialogHeader>
        <GlassDialogTitle className="flex items-center gap-2">
          <Send className="size-5 text-muted-foreground" />
          Send
        </GlassDialogTitle>

        <GlassDialogDescription>
          CLRTY, a token, or an NFT. The address is validated before the
          transaction is built.
        </GlassDialogDescription>
      </GlassDialogHeader>

      <div>
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium">
            What are you sending?
          </div>
          <AssetPicker value={asset} onChange={setAsset} changeView={changeView} currentView={view} />
        </div>

        <form onSubmit={onSend} className="space-y-4 pt-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Recipient address
            </label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
              placeholder="clrty1… / tclrty1… / rclrty1…"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              disabled={submitting}
              className="font-mono text-sm"
            />
            {recipient.length > 0 && recipientError && (
              <p className="mt-1 text-xs text-destructive">{recipientError}</p>
            )}
          </div>

          {isAmountable(asset) && (
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Amount
                {asset.kind === "token" && (
                  <span className="ml-2 text-muted-foreground/70">
                    ({asset.symbol}, {asset.decimals} decimals)
                  </span>
                )}
              </label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                inputMode="decimal"
                spellCheck={false}
                autoComplete="off"
                disabled={submitting}
              />
              {amount.length > 0 && amountError && (
                <p className="mt-1 text-xs text-destructive">{amountError}</p>
              )}
              {asset.kind === "clrty" && account.data && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Available:{" "}
                  {formatClrty(
                    bigIntToHex(hexToBigInt(account.data.balance)),
                  )}{" "}
                  CLRTY
                </p>
              )}
            </div>
          )}

          {asset.kind === "nft" && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <div className="text-xs text-muted-foreground">
                You are sending this NFT
              </div>
              <div className="mt-1 font-mono text-xs">
                #{hexToBigInt(asset.nft.id).toString()}
              </div>
              {asset.nft.metadata_uri && (
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {asset.nft.metadata_uri}
                </div>
              )}
              <div className="mt-3 flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/5 p-2 text-xs text-yellow-700 dark:text-yellow-500">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  NFT transfers aren&apos;t enabled in the browser wallet
                  yet. The transaction builder for{" "}
                  <code className="font-mono">TransferNft</code> is still
                  being wired up on the RPC package side. CLRTY and token
                  transfers work today.
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <GlassButton variant="solid" type="submit" className="w-full" disabled={!canSubmit}>
            {submitting
              ? "Sending…"
              : nftDisabled
                ? "NFT sending coming soon"
                : !assetChosen
                  ? "Choose an asset"
                  : "Send"}
            {!nftDisabled && assetChosen && (
              <ArrowRight className="ml-2 h-4 w-4" />
            )}
          </GlassButton>
        </form>
      </div>
    </>
  );
}

export default SendForm;