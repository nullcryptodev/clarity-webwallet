import { GlassCard } from "@/components/GlassCard";
import Row from "@/components/Row";
import { useTokenMetadata } from "@/lib/hooks";
import { formatClrty, formatCount, HolderEntry, shortAddress, TokenInfo } from "@claritychain/rpc";
import Link from "next/link";
import { FC } from "react";

type props = {
  token: TokenInfo;
  isNative: boolean;
  hasMaxSupply: boolean;
  supply: string | null;
  holders: HolderEntry[];
}

const TokenOverview: FC <props> = ({
  token, isNative, hasMaxSupply, supply, holders
}) => {
  const metadata = useTokenMetadata(BigInt(token.id));

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="font-medium flex items-center gap-2">
          {token.name}{" "}
          <span className="text-muted-foreground font-mono text-sm">
            (${token.symbol})
          </span>
        </div>
        <div className="flex gap-2">
          {isNative && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 font-mono">
              Native
            </span>
          )}
          {token.is_bridged && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-mono">
              Bridged
            </span>
          )}
          {metadata.data && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">
              Metadata
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <Row label="Token ID" value={formatCount(token.id) + (isNative ? "0x0" : "")}/>
        <Row label="Symbol" value={"$" + token.symbol}/>
        <Row label="Name" value={token.name}/>
        <Row label="Decimals" value={token.decimals}/>
        <Row label="Creator" value={token.creator ? shortAddress(token.creator, 12, 8) : "—"}/>
        <Row label="Royalty" value={token.royalty_bps > 0 ? `${(token.royalty_bps / 100).toFixed(2)}%` : "0%"}/>
        <Row label="Current supply" value={supply !== null ? formatClrty(supply) + " $" + token.symbol : "∞"} />
        <Row label="Max supply" value={hasMaxSupply ? formatClrty(token.max_supply) + " $" + token.symbol : "∞"}/>
        {token.fingerprint && (
          <Row label="Fingerprint" value={token.fingerprint}/>
        )}
      </div>

      <hr className="my-4"/>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Top holders</h3>
          {holders && (
            <span className="text-xs text-muted-foreground font-mono">
              {holders.length} shown
            </span>
          )}
        </div>

        {holders === null ? (
          <p className="text-sm text-muted-foreground">
            Holder data is not available.
          </p>
        ) : holders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No holders yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-foreground/5">
            {holders.map((h, idx) => (
              <div
                key={h.address}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-muted-foreground font-mono text-xs w-6 shrink-0">
                    {idx + 1}
                  </span>
                  <Link
                    href={`/search/address/${h.address}`}
                    className="font-mono text-xs hover:underline truncate"
                  >
                    {shortAddress(h.address, 14, 8)}
                  </Link>
                </div>
                <span className="font-mono text-xs shrink-0 ml-4">
                  {formatClrty(h.balance)} {token.symbol}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  )
}

export default TokenOverview;