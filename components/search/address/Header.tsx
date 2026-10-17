"use client";

import { FC, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";

type Props = {
  address: string;
  isEmpty?: boolean;
};

const AddressHeader: FC<Props> = ({ address, isEmpty }) => {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Address
            </span>
            {isEmpty && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground font-mono">
                Empty
              </span>
            )}
          </div>
          <p className="font-mono text-xs break-all opacity-80">
            {address}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={copy}
          aria-label="Copy address"
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

export default AddressHeader;