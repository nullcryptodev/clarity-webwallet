"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import {
  AsyncState,
  TokenHolding,
  useAccount,
  useActiveSet,
  useCurrentHeight,
  useEpochInfo,
  useFeeStats,
  useValidatorForAddress,
  useYourBalances,
  useYourOrders,
  useYourPositions,
  useYourTransactions,
} from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Check, Computer, Copy, Download, Lock } from "lucide-react";
import WalletOverview from "./WalletOverview";
import Actions from "./Actions";
import LiquidityPositions from "./LiquidityPositions";
import Orders from "./Orders";
import Activity from "./Activity";
import Epoch from "./Epoch";
import { hexToBigInt, Validator } from "@claritychain/rpc";
import { GlassButton } from "../GlassButton";

function Dashboard() {
  const wallet = useWallet();
  const balances = useYourBalances();
  const positions = useYourPositions();
  const orders = useYourOrders();
  const activity = useYourTransactions(50);
  const epoch = useEpochInfo();
  const validator = useValidatorForAddress(wallet.address);
  const fees = useFeeStats();
  const account = useAccount(wallet.address);
  const activeSet = useActiveSet();

  // One height poll for the whole page. The header's height
  // display and the balance card's chain strip read the same
  // value, so the two never disagree by a block.
  const height = useCurrentHeight(3000, {
    enabled: wallet.endpoints.length > 0,
  });

  // The hook already splits native from non-native and sorts
  // the non-native list by CLRTY value. These are direct reads;
  // no memo needed, since the object identity of `balances.data`
  // is stable across renders that don't refetch.
  const native = balances.data?.native ?? null;
  const otherTokens = balances.data?.tokens ?? [];

  // Lookup map for any component on the page that needs to
  // resolve a token by id (Orders, LiquidityPositions, Activity
  // may want to render symbols rather than token ids). Memoized
  // because it is an actual derived structure, not a property
  // read.
  const byId = useMemo(() => {
    const m = new Map<bigint, TokenHolding>();
    if (balances.data) {
      m.set(0n, balances.data.native);
      for (const t of balances.data.tokens) m.set(t.tokenId, t);
    }
    return m;
  }, [balances.data]);

  const activeSetSize = activeSet.data
    ? hexToBigInt(activeSet.data.size)
    : null;
  const activeSetQuorum = activeSet.data
    ? hexToBigInt(activeSet.data.quorum)
    : null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <DashboardHeader address={wallet.address} validator={validator} />

      <WalletOverview
        network={wallet.network}
        native={native}
        otherTokens={otherTokens}
        account={account.data}
        validator={validator.data}
        loading={balances.loading}
        height={height.data}
        epoch={epoch.data}
        fees={fees.data}
        activeSetSize={activeSetSize}
        activeSetQuorum={activeSetQuorum}
      />

      <Actions />

      <div className="grid gap-4 lg:grid-cols-2">
        <LiquidityPositions
          positions={positions.data ?? []}
          loading={positions.loading}
        />
        <Orders orders={orders.data ?? []} loading={orders.loading} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Activity
          entries={activity.data ?? []}
          loading={activity.loading}
        />
        <Epoch epoch={epoch.data} />
      </div>
    </div>
  );
}

function DashboardHeader({
  address,
  validator,
}: {
  address: string | null;
  validator: AsyncState<Validator | null>;
}) {
  const wallet = useWallet();
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(address!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied. The address is visible
      // on screen; the user can select it manually.
    }
  };

  const onDownload = () => {
    const file = wallet.keystoreFile();
    if (!file) return;
    const blob = new Blob([JSON.stringify(file, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const label = file.label ?? "clarity-wallet";
    a.download = `${label}.keystore.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Your wallet</h1>
        <div className="flex items-center gap-2">
          <p className="mt-1 break-all font-mono text-sm text-muted-foreground">
            {address ?? "—"}
          </p>

          {/* Copy button — small, icon-only, sits next to the
              address. Glass surface, no blur layers, so it reads
              as a chip rather than a card. */}
          <GlassButton
            variant="solid"
            size="sm"
            onClick={onCopy}
            title={copied ? "Copied" : "Copy address"}
            aria-label={copied ? "Address copied" : "Copy address"}
            className="opacity-80 hover:opacity-100"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </GlassButton>
        </div>
      </div>


      <div className="flex flex-wrap items-stretch gap-2">
        <GlassButton variant="solid" onClick={wallet.lock} className="opacity-80 hover:opacity-100">
          <Lock className="mr-2 size-4" />
          Lock
        </GlassButton>

        <GlassButton variant="solid" onClick={onDownload} className="opacity-80 hover:opacity-100">
          <Download className="mr-2 size-4" />
          {downloaded ? "Downloaded" : "Download keystore"}
        </GlassButton>

        {validator && (
          <Link href="/validator">
            <GlassButton variant="solid" className="opacity-80 hover:opacity-100">
              <Computer className="mr-2 size-4" />
              Manage validator
            </GlassButton>
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * A single action inside the header's glass toolbar. Transparent
 * by default so the toolbar's glass surface shows through; a
 * subtle white tint on hover, and a slightly stronger tint on
 * press, so the button feels responsive without breaking the
 * glass illusion.
 */
function ToolbarButton({
  children,
  onClick,
  as = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  as?: "button" | "div";
}) {
  const className =
    "inline-flex items-center rounded-md px-3 py-1.5 text-sm " +
    "text-foreground/90 transition-colors duration-150 " +
    "hover:bg-white/[0.08] active:bg-white/[0.12] " +
    "cursor-pointer select-none";

  if (as === "div") {
    // Rendered inside a <Link>, so the outer element is the
    // anchor and this is just a visual button. Using a real
    // <button> here would nest an interactive element inside
    // another, which is invalid HTML.
    return <div className={className}>{children}</div>;
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export default Dashboard;