import { bigIntToHex, formatClrty, shortAddress } from "@claritychain/rpc";
import type { SubmitResult } from "@/lib/use-submit-tx";
import { SendAsset } from "./types";
import { FC } from "react";
import { GlassDialogDescription, GlassDialogHeader, GlassDialogTitle } from "@/components/GlassDialog";
import { AlertTriangle, Check, Send } from "lucide-react";
import { assetLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";


type props = {
  result: SubmitResult;
  asset: SendAsset;
  recipient: string;
  onClose: () => void;
  onSendAnother: () => void;
}

const Confirmation: FC <props> = ({
  result, asset, recipient, onClose, onSendAnother,
}) => {
  const status = result.receipt?.status;

  return (
    <>
      <GlassDialogHeader>
        <GlassDialogTitle className="flex items-center gap-2">
          {status === "success" && (
            <>
              <Check className="h-5 w-5 text-green-500" />
              Sent
            </>
          )}
          {status === "failure" && (
            <>
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Transaction failed
            </>
          )}
          {!result.receipt && (
            <>
              <Send className="h-5 w-5 text-muted-foreground" />
              Submitted
            </>
          )}
        </GlassDialogTitle>
        <GlassDialogDescription>
          {status === "failure"
            ? "The transaction was included but the executor rejected it."
            : status === "success"
              ? "The transaction is confirmed."
              : "The transaction is in the mempool; it will confirm shortly."}
        </GlassDialogDescription>
      </GlassDialogHeader>

      <div className="space-y-4 pt-2 text-sm">
        <div className="rounded-lg border bg-muted/40 p-4">
          <div className="text-xs text-muted-foreground">
            {assetLabel(asset)}
          </div>
          <div className="mt-1 break-all font-mono text-xs">
            to {recipient}
          </div>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Transaction</span>
          <span className="font-mono text-xs">
            {shortAddress(result.txid)}
          </span>
        </div>

        {result.receipt && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Block</span>
              <span className="tabular-nums">
                #{result.receipt.blockHeight.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fee paid</span>
              <span className="tabular-nums">
                {formatClrty(bigIntToHex(result.receipt.feePaid))} CLRTY
              </span>
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={onSendAnother} variant="ghost">
            Send another
          </Button>
          <Button onClick={onClose} variant="outline">Done</Button>
        </div>
      </div>
    </>
  );
}

export default Confirmation;