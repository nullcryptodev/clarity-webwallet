import Link from "next/link";
import TokensTable from "../TokensTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Coins } from "lucide-react";
import { useTokensByCreator } from "@/lib/hooks";
import { GlassCard } from "../GlassCard";
import { FC } from "react";

type props = {
  address: string | null;
  onCreateClick: () => void;
}

const CreatedTokens: FC <props> = ({ address, onCreateClick }) => {
  const created = useTokensByCreator(address);
  const tokens = created.data ?? [];

  return (
    <GlassCard className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Coins className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">Tokens you created</CardTitle>
            <CardDescription>
              Tokens where this address is the creator. You can mint,
              burn, and update metadata on these.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {created.loading && tokens.length === 0 && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {!created.loading && tokens.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            You haven't created any tokens.{" "}
            <span
              onClick={onCreateClick}
              className="underline underline-offset-4 cursor-pointer"
            >
              Create one
            </span>
            .
          </p>
        )}
        {tokens.length > 0 && <TokensTable tokens={tokens} showManage />}
      </CardContent>
    </GlassCard>
  );
}

export default CreatedTokens;