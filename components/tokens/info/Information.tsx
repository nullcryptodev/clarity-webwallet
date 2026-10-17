import { GlassCard } from "@/components/GlassCard";
import Row from "@/components/Row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTokenAmount, shortAddress, TokenInfo } from "@claritychain/rpc";
import { Coins } from "lucide-react";
import { FC } from "react";

type props = {
  token: TokenInfo;
}

const TokenInformation: FC <props> = ({
  token
}) => {

  return (
    <GlassCard>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Coins className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Token</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Row label="Name" value={token.name} />
        <Row label="Symbol" value={token.symbol} />
        <Row label="Decimals" value={String(token.decimals)} />
        <Row
          label="Max supply"
          value={
            token.max_supply === "0x0"
              ? "Unlimited"
              : formatTokenAmount(BigInt(token.max_supply), 0)
          }
        />
        <Row
          label="Royalty"
          value={
            token.royalty_bps > 0
              ? `${(token.royalty_bps / 100).toFixed(2)}%`
              : "None"
          }
        />
        <Row
          label="Creator"
          value={
            token.creator ? (
              <span className="font-mono text-xs">
                {shortAddress(token.creator)}
              </span>
            ) : (
              "—"
            )
          }
        />
        {token.fingerprint && (
          <Row
            label="Fingerprint"
            value={
              <span className="font-mono text-xs">
                {shortAddress(token.fingerprint)}
              </span>
            }
          />
        )}
        <Row
          label="Flags"
          value={
            [
              token.is_native ? "native" : null,
              token.is_bridged ? "bridged" : null,
            ]
              .filter(Boolean)
              .join(", ") || "—"
          }
        />
      </CardContent>
    </GlassCard>
  )
}

export default TokenInformation;