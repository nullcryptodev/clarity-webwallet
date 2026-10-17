"use client";

import { FC, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Receipt } from "@claritychain/rpc";
import { GlassCard } from "../../GlassCard";

type Props = {
  hash: string;
  pending: boolean;
  receipt: Receipt | null;
};

const TransactionHeader: FC<Props> = ({ hash, pending, receipt }) => {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Transaction
            </span>
            <StatusBadge pending={pending} receipt={receipt} />
          </div>
          <p className="font-mono text-xs break-all opacity-80">
            {hash}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={copy}
          aria-label="Copy transaction hash"
        >
          {copied ? (
            <Check className="size-4" />
          ) : (
            <Copy className="size-4" />
          )}
        </Button>
      </div>
    </GlassCard>
  );
};

const StatusBadge: FC<{
  pending: boolean;
  receipt: Receipt | null;
}> = ({ pending, receipt }) => {
  if (pending) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-mono">
        Pending
      </span>
    );
  }
  if (receipt?.status === "failure") {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-mono">
        Failed
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-mono">
      Confirmed
    </span>
  );
};

export default TransactionHeader;