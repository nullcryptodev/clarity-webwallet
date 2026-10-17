"use client";

import { FC, FormEvent, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lock } from "lucide-react";
import { toast } from "@/components/ui/toast";

type props = {
  /**
   * Called when the user wants to switch to the import view
   * without leaving the session gate. When omitted, the
   * "different keystore" affordance falls back to a link to
   * `/wallet/import`.
   */
  onSwitchToImport?: () => void;
};

/**
 * The unlock screen. Renders when a keystore is loaded but
 * locked, and offers the one action that resolves that state:
 * enter the password.
 *
 * The card is centered in the viewport because it's the only
 * thing on the page. A left-aligned max-width card on a wide
 * screen reads as a settings form that failed to load rather
 * than a deliberate gate.
 *
 * The escape hatch at the bottom ("use a different keystore")
 * matters more than it looks. A user who restored the wrong
 * keystore file, or who has two keystores and opened the wrong
 * one, has no way out of the lock screen if the only control is
 * the password field. The link sends them back to the import
 * flow, which replaces the loaded keystore.
 */
const Locked: FC<props> = ({ onSwitchToImport }) => {
  const wallet = useWallet();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || password.length === 0) return;
    setBusy(true);
    setError(null);

    // Diagnostic A: we entered the submit handler.
    console.log("[unlock] submit handler entered");

    try {
      await wallet.unlock(password);
      setPassword("");

      // Diagnostic B: unlock resolved without throwing.
      console.log("[unlock] wallet.unlock resolved");

      try {
        const id = toast.add({
          type: "success",
          title: "Successfully unlocked wallet.",
          priority: "high",
          timeout: 5000,
        });
        console.log("[unlock] success toast added, id =", id);
      } catch (toastErr) {
        // If toast.add itself throws, we want to see it.
        console.error("[unlock] toast.add (success) threw:", toastErr);
      }
    } catch (err) {
      // Diagnostic C: unlock rejected.
      console.log("[unlock] wallet.unlock rejected:", err);

      try {
        const id = toast.add({
          type: "error",
          title: "Unlock wallet failed.",
          description:
            err instanceof Error ? err.message : "Could not unlock the wallet.",
          priority: "high",
          timeout: 5000,
        });
        console.log("[unlock] error toast added, id =", id);
      } catch (toastErr) {
        // If toast.add throws here, the catch block would otherwise
        // propagate the throw silently through the async boundary.
        console.error("[unlock] toast.add (error) threw:", toastErr);
      }

      // Keep the password in the field so the user can correct a typo.
      // The previous inline-error display is still available if you
      // want to re-enable it; see the commented block below.
      // setError(
      //   err instanceof Error ? err.message : "Could not unlock the wallet.",
      // );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="liquid-glass mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <div className="relative z-10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold">Wallet locked</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the password you set when you created the keystore.
          </p>
        </div>

        {/* The unlock card. `liquid-glass` supplies the surface,
            border, radius, shadow and the pseudo-element sheen;
            the padding below supplies the internal spacing that
            Card / CardHeader / CardContent used to give us. */}
        <div className="liquid-glass px-6 py-6">
          {/* Optional depth layers. Remove if the blur is too
              heavy on a small card. */}
          <div className="lg-blur lg-blur-1" aria-hidden />
          <div className="lg-blur lg-blur-2" aria-hidden />

          <div className="relative z-10">
            <h2 className="mb-4 text-base font-medium">Unlock</h2>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="wallet-password"
                  className="mb-1 block text-xs text-muted-foreground"
                >
                  Password
                </label>
                <Input
                  id="wallet-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  autoComplete="current-password"
                  disabled={busy}
                  aria-invalid={error !== null}
                  aria-describedby={
                    error ? "wallet-password-error" : undefined
                  }
                />
                {error && (
                  <p
                    id="wallet-password-error"
                    className="mt-2 flex items-start gap-2 text-xs text-destructive"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    {error}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={busy || password.length === 0}
                variant="outline"
              >
                {busy ? "Unlocking…" : "Unlock"}
              </Button>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Lost the password or have a different keystore?{" "}
          {onSwitchToImport ? (
            <button
              type="button"
              onClick={onSwitchToImport}
              className="underline underline-offset-4 hover:text-foreground"
            >
              Import a different one
            </button>
          ) : (
            <Link
              href="/wallet/import"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Import with your recovery phrase
            </Link>
          )}
        </p>
      </div>
    </div>
  );
};

export default Locked;