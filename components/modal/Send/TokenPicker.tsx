import { formatTokenAmount } from "@/components/trade/swap-tab";
import { useYourBalances } from "@/lib/hooks";
import Link from "next/link";
import { FC } from "react";

type props = {
  selected: string | undefined;
  onSelect: (tokenId: bigint, symbol: string, decimals: number) => void;
};

const TokenPicker: FC<props> = ({ selected, onSelect }) => {
  const balances = useYourBalances();
  const tokens = balances.data?.tokens ?? [];

  if (balances.loading && tokens.length === 0) {
    return <p className="text-sm text-muted-foreground">Loading tokens…</p>;
  }
  if (tokens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You don't hold any tokens.{" "}
        <Link href="/tokens" className="underline underline-offset-4">
          Create one
        </Link>{" "}
        or receive one first.
      </p>
    );
  }

  return (
    <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
      {tokens.map((t) => {
        const isSelected = selected === t.tokenId.toString();
        return (
          <li key={t.tokenId.toString()}>
            <button
              type="button"
              onClick={() =>
                onSelect(
                  t.tokenId,
                  t.symbol ?? `#${t.tokenId}`,
                  t.decimals ?? 0,
                )
              }
              className={`flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition-colors ${isSelected
                  ? "border-foreground/40 bg-muted/40"
                  : "hover:bg-muted/30"
                }`}
            >
              <span>
                <span className="font-medium">
                  {t.symbol ?? `Token #${t.tokenId}`}
                </span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  #{t.tokenId.toString()}
                </span>
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatTokenAmount(t.balance, t.decimals ?? 0)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default TokenPicker;