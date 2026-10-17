"use client";

import { FC, useState } from "react";
import { SendModal } from "../modal/Send";
import { Coins, Droplets, Send, Sprout } from "lucide-react";
import ActionTile from "../ActionTile";

const Actions: FC = () => {
  const [sendOpen, setSendOpen] = useState(false);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActionTile
          onClick={() => setSendOpen(true)}
          icon={Send}
          label="Send"
          description="Transfer CLRTY or a token"
        />
        <ActionTile
          href="/tokens"
          icon={Coins}
          label="Tokens"
          description="Create, mint, and burn"
        />
        <ActionTile
          href="/stake"
          icon={Sprout}
          label="Stake"
          description="Opt in and claim rewards"
        />
        <ActionTile
          href="/trade"
          icon={Droplets}
          label="Trade"
          description="Swap, pool, or place an order"
        />
      </div>

      <SendModal open={sendOpen} onOpenChange={setSendOpen} />
    </>
  );
};

export default Actions;