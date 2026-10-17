import { NftInfo } from "@claritychain/rpc";

export type SendAsset =
  | { kind: "clrty" }
  | { kind: "token-selecting" }
  | { kind: "token"; tokenId: bigint; symbol: string; decimals: number }
  | { kind: "nft-selecting" }
  | { kind: "nft"; nft: NftInfo };

export type AmountableAsset = Extract<SendAsset, { kind: "clrty" | "token" }>;

export type SendType = 'native' | 'token' | 'nft';