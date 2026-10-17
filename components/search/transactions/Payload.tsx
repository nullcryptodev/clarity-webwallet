"use client";

import { FC, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "../../GlassCard";

type Props = {
  payload: string;
  payloadSize: number;
};

const TransactionPayload: FC<Props> = ({ payload, payloadSize }) => {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(payload).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  //  Guess at whether the payload might be ASCII text rather than
  //  opaque bytes. A user submitting a Transfer has no payload; a
  //  user submitting a token or a validator operation has a
  //  structured payload. When the bytes happen to be printable, show
  //  them as text underneath the hex — it occasionally helps.
  const asciiPreview = (() => {
    const hex = payload.startsWith("0x") ? payload.slice(2) : payload;
    if (hex.length === 0 || hex.length % 2 !== 0) return null;
    let out = "";
    for (let i = 0; i < hex.length; i += 2) {
      const byte = parseInt(hex.slice(i, i + 2), 16);
      if (byte === 0) return null;
      if (byte >= 0x20 && byte < 0x7f) out += String.fromCharCode(byte);
      else if (byte === 0x0a) out += "\n";
      else return null;
    }
    return out;
  })();

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Payload</h3>
          <span className="text-xs text-muted-foreground font-mono">
            {payloadSize} bytes
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={copy}
          className="gap-2"
        >
          {copied ? (
            <Check className="size-3" />
          ) : (
            <Copy className="size-3" />
          )}
          Copy hex
        </Button>
      </div>

      <pre className="text-xs font-mono break-all whitespace-pre-wrap bg-muted/30 p-3 rounded">
        {payload}
      </pre>

      {asciiPreview && (
        <div className="mt-3">
          <div className="text-xs text-muted-foreground mb-1">
            ASCII preview
          </div>
          <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/30 p-3 rounded">
            {asciiPreview}
          </pre>
        </div>
      )}
    </GlassCard>
  );
};

export default TransactionPayload;