import { useNftsForOwner } from "@/lib/hooks";
import { useWallet } from "@/lib/wallet";
import { hexToBigInt, NftInfo } from "@claritychain/rpc";
import { ImageIcon } from "lucide-react";
import Link from "next/link";



function NftPicker({
  selected,
  onSelect,
}: {
  selected: string | undefined;
  onSelect: (nft: NftInfo) => void;
}) {
  const wallet = useWallet();
  const nfts = useNftsForOwner(wallet.address, { limit: 50 });

  if (nfts.loading && (nfts.data ?? []).length === 0) {
    return <p className="text-sm text-muted-foreground">Loading NFTs…</p>;
  }
  if ((nfts.data ?? []).length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You don't own any NFTs.{" "}
        <Link href="/nfts" className="underline underline-offset-4">
          Mint one
        </Link>{" "}
        first.
      </p>
    );
  }

  return (
    <ul className="grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
      {(nfts.data ?? []).map((nft) => {
        const id = hexToBigInt(nft.id);
        const isSelected = selected === id.toString();
        return (
          <li key={nft.id}>
            <button
              type="button"
              onClick={() => onSelect(nft)}
              className={`flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors ${isSelected
                ? "border-foreground/40 bg-muted/40"
                : "hover:bg-muted/30"
                }`}
            >
              <ImageIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="font-mono text-xs">#{id.toString()}</div>
                {nft.metadata_uri && (
                  <div className="truncate text-xs text-muted-foreground">
                    {nft.metadata_uri}
                  </div>
                )}
                {hexToBigInt(nft.collection_id) !== 0n && (
                  <div className="text-xs text-muted-foreground">
                    Collection #{hexToBigInt(nft.collection_id).toString()}
                  </div>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default NftPicker;