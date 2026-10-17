import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/lib/wallet";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";


function ImportMnemonic() {
  const wallet = useWallet();
  const router = useRouter();

  const [mnemonic, setMnemonic] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = mnemonic.trim().split(/\s+/).filter(Boolean).length;
  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit =
    wordCount >= 12 &&
    password.length >= 8 &&
    password === confirm &&
    !busy;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { keystore } = await wallet.importFromMnemonic(
        mnemonic.trim(),
        password,
      );

      //  Offer the keystore as a download so the user doesn't have
      //  to re-enter the mnemonic next time.
      const blob = new Blob([JSON.stringify(keystore, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${keystore.label ?? "clarity-wallet"}.keystore.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      //  Wait for the download to start, then navigate.
      setTimeout(() => router.push("/wallet"), 500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not import the wallet.",
      );
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from mnemonic</CardTitle>
        <CardDescription>
          Enter the words from your recovery phrase, separated by
          spaces.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Recovery phrase ({wordCount} word
              {wordCount === 1 ? "" : "s"})
            </label>
            <textarea
              value={mnemonic}
              onChange={(e) => setMnemonic(e.target.value)}
              placeholder="word1 word2 word3 …"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              rows={4}
              disabled={busy}
              className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              New password (encrypts the keystore)
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
            {tooShort && (
              <p className="mt-1 text-xs text-destructive">
                Password must be at least 8 characters.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Confirm password
            </label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={busy}
            />
            {mismatch && (
              <p className="mt-1 text-xs text-destructive">
                Passwords do not match.
              </p>
            )}
          </div>

          {error && (
            <p className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!canSubmit}
          >
            {busy
              ? "Importing…"
              : "Import and download keystore"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default ImportMnemonic;