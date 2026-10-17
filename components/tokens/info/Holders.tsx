import { GlassCard } from "@/components/GlassCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTokenHolders } from "@/lib/hooks";
import { formatTokenAmount, shortAddress, TokenInfo } from "@claritychain/rpc";
import { FC } from "react";

type props = {
  token: TokenInfo;
  tokenId: bigint | null;
}

const TokenHolders: FC <props> = ({
  token, tokenId
}) => {
  const holders = useTokenHolders(tokenId, 20);

  return (
    <GlassCard>
      <CardHeader>
        <CardTitle className="text-lg">Holders</CardTitle>
        <CardDescription>
          The addresses with the largest balances of this token.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {(holders.data ?? []).length === 0 && !holders.loading && (
          <p className="text-sm text-muted-foreground">No holders this token.</p>
        )}

        {(holders.data ?? []).length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(holders.data ?? []).map((h) => (
                <TableRow key={h.address}>
                  <TableCell className="font-mono text-xs">
                    {shortAddress(h.address)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatTokenAmount(BigInt(h.balance), token.decimals)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </GlassCard>
  )
}

export default TokenHolders;