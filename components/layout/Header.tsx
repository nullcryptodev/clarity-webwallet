"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useWallet } from "@/lib/wallet";
import { useCurrentHeight } from "@/lib/hooks";
import type { Network } from "@claritychain/wallet";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  requiresWallet: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/wallet", label: "Wallet", requiresWallet: true },
  { href: "/tokens", label: "Tokens", requiresWallet: true },
  { href: "/stake", label: "Stake", requiresWallet: true },
  { href: "/trade", label: "Trade", requiresWallet: true },
  { href: "/search", label: "Search", requiresWallet: false },
];

export function Header() {
  const wallet = useWallet();
  const isConnected = wallet.isUnlocked;

  // Poll the height only when an unlocked wallet is looking at
  // the header. A landing page with no wallet shouldn't hit the
  // network on a timer.
  const height = useCurrentHeight(isConnected ? 3000 : 0);

  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center">
            <Image
              src="/clarity-transparent.png"
              alt="Clarity"
              width={40}
              height={40}
              className="size-10 transition-opacity hover:opacity-80"
            />
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                enabled={!item.requiresWallet || isConnected}
              />
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-muted-foreground sm:inline">
            {height.data !== null && `Block #${height.data.toLocaleString()}`}
          </span>

          <NetworkBadge network={wallet.network} />
        </div>
      </div>
    </header>
  );
}

function NavLink({ item, enabled }: { item: NavItem; enabled: boolean }) {
  const pathname = usePathname();
  // Prefix match so /wallet/send also highlights "Wallet".
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");

  if (!enabled) {
    return (
      <span
        className={cn(
          "cursor-not-allowed text-muted-foreground/50",
          isActive && "text-blue-500",
        )}
        aria-disabled="true"
        title="Unlock a wallet to use this"
      >
        {item.label}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "duration-150",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {item.label}
    </Link>
  );
}

function NetworkBadge({ network }: { network: Network }) {
  const label = networkLabel(network);
  const color = networkColor(network);

  return (
    <span className="inline-flex cursor-default items-center gap-2 rounded-full border px-3 py-1 text-xs">
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function networkLabel(network: Network): string {
  switch (network) {
    case "mainnet":
      return "Mainnet";
    case "testnet":
      return "Testnet";
    case "regtest":
      return "Regtest";
    default: {
      const _exhaustive: never = network;
      return String(_exhaustive);
    }
  }
}

function networkColor(network: Network): string {
  switch (network) {
    case "mainnet":
      return "bg-green-500";
    case "testnet":
      return "bg-yellow-500";
    case "regtest":
      return "bg-blue-500";
    default: {
      const _exhaustive: never = network;
      return "";
    }
  }
}