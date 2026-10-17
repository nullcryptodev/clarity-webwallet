"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet";

import PageHeading from "@/components/PageHeading";
import YourTokens from "@/components/tokens/YourTokens";
import CreatedTokens from "@/components/tokens/CreatedTokens";
import AllTokens from "@/components/tokens/AllTokens";
import { CreateTokenModal } from "@/components/modal/CreateToken";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { GlassButton } from "@/components/GlassButton";

export default function TokensPage() {
  const wallet = useWallet();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <div className="p-4 flex flex-col">
        <PageHeading
          go_back_url="/wallet"
          title="Tokens"
          subtitle="Create, hold, and manage fungible tokens on Clarity."
          action={
            <GlassButton onClick={() => setCreateOpen(true)} variant="solid" className="opacity-75 hover:opacity-100">
              <Plus className="size-4" />
              Create Token
            </GlassButton>
          }
        />

        <div className="grid lg:grid-cols-2 gap-6">
          <YourTokens onCreateClick={() => setCreateOpen(true)} />
          <CreatedTokens address={wallet.address} onCreateClick={() => setCreateOpen(true)} />
        </div>
        <AllTokens />
      </div>

      {wallet.isUnlocked && (
        <CreateTokenModal
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      )}
    </div>
  );
}