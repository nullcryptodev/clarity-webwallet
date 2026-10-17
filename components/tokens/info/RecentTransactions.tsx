import { GlassCard } from "@/components/GlassCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTokenTransfers } from "@/lib/hooks";
import { formatTokenAmount, shortAddress, TokenInfo } from "@claritychain/rpc";
import { FC } from "react";

type props = {
  token: TokenInfo;
  tokenId: bigint | null;
}

const TokenRecentTransactions: FC <props> = ({
  token, tokenId
}) => {
  const transfers = useTokenTransfers(tokenId, 15);

  return (
    <GlassCard>
      <CardHeader>
        <CardTitle className="text-lg">Recent transfers</CardTitle>
        <CardDescription>
          The most recent movements of this token.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(transfers.data ?? []).length === 0 && !transfers.loading && (
          <p className="text-sm text-muted-foreground">
            No transfers yet.
          </p>
        )}
        {(transfers.data ?? []).length > 0 && (
          <ul className="divide-y">
            {(transfers.data ?? []).map((x, i) => (
              <li
                key={`${x.tx.hash}-${i}`}
                className="flex items-center justify-between py-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-mono text-xs">
                    {x.tx.to
                      ? `${shortAddress(x.tx.from)} → ${shortAddress(x.tx.to)}`
                      : `minted to ${shortAddress(x.tx.from)}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {shortAddress(x.tx.hash)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="tabular-nums">
                    {formatTokenAmount(BigInt(x.tx.amount), token.decimals)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    #{Number(BigInt(x.block_height)).toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </GlassCard>
  )
}

export default TokenRecentTransactions;