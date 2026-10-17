import { FC } from "react";
import { SendAsset, SendType } from "./types";
import { GlassButton } from "@/components/GlassButton";
import { Coins, ImageIcon } from "lucide-react";
import { cn } from "cn";
import TokenPicker from "./TokenPicker";
import NftPicker from "./NftPicker";
import { hexToBigInt } from "@claritychain/rpc";

type props = {
  value: SendAsset;
  onChange: (asset: SendAsset) => void;
  changeView: (swapViewTo: SendType) => void;
  currentView: SendType;
}

const AssetPicker: FC <props> = ({
  value,
  onChange,
  changeView,
  currentView
}) => {
  const activeTab =
    value.kind === "clrty"
      ? "clrty"
      : value.kind === "token" || value.kind === "token-selecting"
        ? "token"
        : "nft";

  return (
    <div className="flex flex-col gap-2">
      <div className="grid w-full grid-cols-3 gap-2">
        <GlassButton
          variant="solid"
          className={cn(
            currentView == 'native' ? 'opacity-100 duration-150' : 'opacity-50 hover:opacity-80 duration-150',
          )}
          onClick={() => changeView('native')}
        >
          <Coins className="mr-2 h-4 w-4" />
          CLRTY
        </GlassButton>

        <GlassButton
          variant="solid"
          className={cn(
            currentView == 'token' ? 'opacity-100 duration-150' : 'opacity-50 hover:opacity-80 duration-150',
          )}
          onClick={() => changeView('token')}
        >
          <Coins className="mr-2 h-4 w-4" />
          Tokens
        </GlassButton>

        <GlassButton
          variant="solid"
          className={cn(
            currentView == 'nft' ? 'opacity-100 duration-150' : 'opacity-50 hover:opacity-80 duration-150',
          )}
          onClick={() => changeView('nft')}
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          NFTs
        </GlassButton>
      </div>

      {currentView == 'token' && (
        <div className="pt-4">
          <TokenPicker
            selected={
              value.kind === "token" ? value.tokenId.toString() : undefined
            }
            onSelect={(tokenId, symbol, decimals) =>
              onChange({ kind: "token", tokenId, symbol, decimals })
            }
          />
        </div>
      )}

      {currentView == 'nft' && (
        <div className="pt-4">
          <NftPicker
            selected={
              value.kind === "nft"
                ? hexToBigInt(value.nft.id).toString()
                : undefined
            }
            onSelect={(nft) => onChange({ kind: "nft", nft })}
          />
        </div>
      )}
    </div>
  );
}

export default AssetPicker;