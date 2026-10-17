import { ManageTokenModal } from "@/components/modal/manage-token";
import { Button } from "@/components/ui/button";
import { useBalance } from "@/lib/hooks";
import { useWallet } from "@/lib/wallet";
import { TokenInfo } from "@claritychain/rpc";
import { Droplets, Settings } from "lucide-react";
import Link from "next/link";
import { FC, useState } from "react";

type props = {
  token: TokenInfo;
  tokenId: bigint | null;
}

const TokenHeader: FC <props> = ({
  token, tokenId
}) => {
  const wallet = useWallet();
  const balance = useBalance(wallet.address, tokenId);
  const [manageOpen, setManageOpen] = useState(false);

  const isCreator =
    wallet.address !== null &&
    token.creator !== null &&
    token.creator === wallet.address;
  const holds = balance.data !== null && balance.data > 0n;

  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold">{token.name}</h1>
        <p className="mt-1 text-muted-foreground">
          ${token.symbol} · <span className="font-mono">#{token.id}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {holds && (
          <Link href={`/trade`}>
            <Button variant="outline">
              <Droplets className="mr-2 h-4 w-4" />
              Trade
            </Button>
          </Link>
        )}

        {isCreator && (
          <>
            <Button variant="outline" onClick={() => setManageOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Manage
            </Button>
          </>
        )}
      </div>

      <ManageTokenModal
        tokenId={tokenId}
        open={manageOpen}
        onOpenChange={setManageOpen}
      />
    </div>
  )
}

export default TokenHeader;