"use client";

import { FC, ReactNode, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { Header } from "../Header";
import NotLoaded from "./NotLoaded";
import Locked from "./Locked";
import { usePathname } from "next/navigation";

type props = {
  children: ReactNode;
};

/**
 * Which of the unauthenticated views the user is currently on.
 *
 * `auto` means "whichever state the wallet dictates" — the
 * default. The other two are explicit choices the user made
 * from a link, which override the automatic gate until the
 * wallet state changes.
 */
type SessionView = "auto" | "create" | "import";

/**
 * Routes that bypass the session gate entirely.
 *
 * A public route renders its children regardless of wallet
 * state — no NotLoaded, no Locked, no Import. The route itself
 * is responsible for whatever UI it wants to show.
 *
 *   /                landing page
 *   /wallet          wallet hub and everything nested under it
 *   /search          explorer: blocks, txs, addresses, tokens
 *
 * Matching is by exact path or by prefix-with-boundary. A
 * pathname is public when it equals a base path, or when it
 * starts with the base path followed by a `/`. This makes
 * `/wallet` and `/wallet/import` public, but does not
 * accidentally make `/wallets` public because it shares the
 * `/wallet` prefix.
 */
const PUBLIC_EXACT = new Set(["/", "/wallet/new", "/wallet/import"]);
const PUBLIC_PREFIXES = ["/search"] as const;

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(
    (root) => pathname === root || pathname.startsWith(root + "/"),
  );
}

/**
 * The session gate.
 *
 * Three states, checked in order:
 *
 *   1. Public route             → children (no gate)
 *   2. No keystore loaded       → NotLoaded (create / import)
 *   3. Keystore loaded, locked  → Locked (unlock prompt)
 *   4. Keystore loaded, unlocked → children
 *
 * The first three unauthenticated states also let the user
 * switch between "create a new wallet" and "import an existing
 * one" without navigating to a separate route. The `view`
 * state overrides the automatic gate until the wallet state
 * changes — for example, a user with a locked keystore who
 * clicks "use a different keystore" sees the import panel even
 * though a keystore is still loaded. Loading a new keystore
 * resets the view to `auto`.
 */
const Session: FC<props> = ({ children }) => {
  const wallet = useWallet();
  const pathname = usePathname();
  const [view, setView] = useState<SessionView>("auto");

  //  Reset the view override when the wallet state changes.
  //  Loading a keystore, unlocking, or locking means the
  //  previous choice is stale. The reset happens on the next
  //  render after `wallet.isLoaded` or `wallet.isUnlocked`
  //  flips, using a tiny effect-free trick: track the previous
  //  values and reset if they differ.
  const [prevLoaded, setPrevLoaded] = useState(wallet.isLoaded);
  const [prevUnlocked, setPrevUnlocked] = useState(wallet.isUnlocked);

  if (prevLoaded !== wallet.isLoaded || prevUnlocked !== wallet.isUnlocked) {
    setPrevLoaded(wallet.isLoaded);
    setPrevUnlocked(wallet.isUnlocked);
    //  A wallet state change means the previous view choice is
    //  no longer meaningful. Reset to auto so the gate picks
    //  the right default for the new state.
    if (view !== "auto") setView("auto");
  }

  //  Public routes bypass the gate. Their own page component
  //  decides what to render, and in particular the lock screen
  //  must not appear on them.
  const publicRoute = isPublicRoute(pathname);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="fixed inset-0 -z-10 mesh-gradient-dark dark:opacity-20"
      />

      <div className="relative">
        <Header />

        {publicRoute && children}

        {/* Unlocked: always show the app, whatever the view was. */}
        {!publicRoute && wallet.isLoaded && wallet.isUnlocked && children}

        {/* Locked: unlock prompt, with a link to switch to import. */}
        {!publicRoute && wallet.isLoaded && !wallet.isUnlocked && view !== "import" && (
          <Locked onSwitchToImport={() => setView("import")} />
        )}

        {/* Not loaded: create / import panel, default view. */}
        {!publicRoute && !wallet.isLoaded && view === "auto" && (
          <NotLoaded onSwitchToImport={() => setView("import")} />
        )}
      </div>
    </div>
  );
};

export default Session;