"use client";

import { FC, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TransactionWithLocation } from "@claritychain/rpc";
import { GlassCard } from "../../GlassCard";


type Props = {
  bundle: TransactionWithLocation;
};

const TransactionRaw: FC<Props> = ({ bundle }) => {
  const [expanded, setExpanded] = useState(false);

  //  Pretty-print with stable key order. The RPC returns a JSON
  //  object; JSON.stringify with two-space indent is good enough
  //  for a "show me the raw response" view.
  const json = JSON.stringify(bundle, null, 2);

  return (
    <GlassCard>
      <button
        type="button"
        className="w-full p-4 flex items-center gap-2 text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
        <h3 className="font-medium">Raw response</h3>
        <span className="text-xs text-muted-foreground font-mono ml-auto">
          {json.length} bytes
        </span>
      </button>

      {expanded && (
        <>
          <hr />
          <div className="p-4">
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/30 p-3 rounded max-h-[600px] overflow-auto">
              {json}
            </pre>
          </div>
        </>
      )}
    </GlassCard>
  );
};

export default TransactionRaw;