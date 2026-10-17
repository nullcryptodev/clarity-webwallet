"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/lib/wallet";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
} from "lucide-react";

type Step = "intro" | "show-mnemonic" | "confirm" | "password";

export default function NewWalletPage() {
  const wallet = useWallet();
  const router = useRouter();

  const [step, setStep] = useState<Step>("intro");
  const [mnemonic, setMnemonic] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the wallet is already unlocked when this page mounts, the user
  // probably navigated here by accident. Redirect rather than
  // silently creating a second wallet.
  if (wallet.isUnlocked) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>A wallet is already unlocked</CardTitle>
            <CardDescription>
              To create a new one, first lock or close the current wallet.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex gap-2">
            <Link href="/wallet">
              <Button>
                Back to wallet
              </Button>
            </Link>

            <Link href="/dex">
              <Button variant="outline">
                Go to the DEX
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      //  Generate the mnemonic without persisting anything. We only
      //  create the keystore at the password step, so a user who
      //  cancels before then leaves no trace on disk.
      const { generateMnemonic } = await import("@claritychain/wallet");
      const m = generateMnemonic(24);
      setMnemonic(m);
      setStep("show-mnemonic");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not generate a mnemonic.",
      );
    } finally {
      setBusy(false);
    }
  };

  const finish = async (password: string) => {
    setBusy(true);
    setError(null);
    try {
      //  `importFromMnemonic` on the context does the derivation and
      //  installs the wallet in one call. It returns the keystore so
      //  we can hand it to the user for download.
      const { keystore } = await wallet.importFromMnemonic(mnemonic, password);

      //  Trigger the download. The download is asynchronous from the
      //  browser's point of view; we give it half a second before
      //  navigating, otherwise some browsers cancel the in-flight
      //  write when the page unloads.
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

      setTimeout(() => router.push("/wallet"), 500);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not create the wallet.",
      );
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">Create a wallet</h1>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {step === "intro" && <Intro onContinue={start} busy={busy} />}

      {step === "show-mnemonic" && (
        <ShowMnemonic
          mnemonic={mnemonic}
          onContinue={() => setStep("confirm")}
        />
      )}

      {step === "confirm" && (
        <ConfirmMnemonic
          mnemonic={mnemonic}
          onContinue={() => setStep("password")}
        />
      )}

      {step === "password" && (
        <SetPassword onSubmit={finish} busy={busy} />
      )}
    </div>
  );
}

// --------------------------------------------------------------- steps

function Intro({
  onContinue,
  busy,
}: {
  onContinue: () => void;
  busy: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Before you begin</CardTitle>
        <CardDescription>
          You&apos;re about to generate a 24-word recovery phrase. Read
          this carefully.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3 text-sm">
          <li className="flex gap-3">
            <Check className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span>
              <strong>Write it down on paper.</strong> Not in a
              screenshot, not in a chat with yourself, not in a password
              manager you don&apos;t trust.
            </span>
          </li>
          <li className="flex gap-3">
            <Check className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span>
              <strong>Store it offline.</strong> A piece of paper in a
              safe is better than a file on your laptop.
            </span>
          </li>
          <li className="flex gap-3">
            <Check className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span>
              <strong>Never share it.</strong> Anyone with the words can
              spend your funds. No legitimate service will ask for them.
            </span>
          </li>
          <li className="flex gap-3">
            <Check className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span>
              <strong>This is the only backup.</strong> If you lose the
              words, you lose the wallet. There is no recovery.
            </span>
          </li>
        </ul>

        <Button className="w-full" onClick={onContinue} disabled={busy}>
          {busy ? "Generating…" : "Generate my recovery phrase"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function ShowMnemonic({
  mnemonic,
  onContinue,
}: {
  mnemonic: string;
  onContinue: () => void;
}) {
  const words = mnemonic.split(" ");
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    //  Clear the clipboard after a while. Best-effort; some browsers
    //  will silently refuse the second write.
    setTimeout(() => {
      navigator.clipboard.writeText("").catch(() => { });
    }, 30_000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your recovery phrase</CardTitle>
        <CardDescription>
          Write these words down, in order. This is the only time they
          will be shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-4 font-mono text-sm sm:grid-cols-3">
          {words.map((word, i) => (
            <li key={i} className="flex items-baseline gap-2">
              <span className="w-6 text-right text-xs text-muted-foreground">
                {i + 1}.
              </span>
              <span>{word}</span>
            </li>
          ))}
        </ol>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCopy}>
            <Copy className="mr-2 h-4 w-4" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Copying to the clipboard is convenient but leaves the phrase
          where other apps can read it. Prefer writing it down.
        </p>

        <Button className="w-full" onClick={onContinue}>
          I&apos;ve written it down
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function ConfirmMnemonic({
  mnemonic,
  onContinue,
}: {
  mnemonic: string;
  onContinue: () => void;
}) {
  const words = mnemonic.split(" ");

  //  Pick three words to ask about. Stable across renders within
  //  this mount because of the lazy useState initializer.
  const [indices] = useState(() => {
    const set = new Set<number>();
    while (set.size < 3) {
      set.add(Math.floor(Math.random() * words.length));
    }
    return Array.from(set).sort((a, b) => a - b);
  });

  const [entries, setEntries] = useState<string[]>(["", "", ""]);

  const allMatch = indices.every(
    (idx, i) =>
      entries[i]?.trim().toLowerCase() === words[idx]?.toLowerCase(),
  );

  const onEntry = (i: number, value: string) => {
    const copy = [...entries];
    copy[i] = value;
    setEntries(copy);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm your recovery phrase</CardTitle>
        <CardDescription>
          Enter the requested words to confirm you wrote them down.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {indices.map((idx, i) => (
          <div key={idx}>
            <label className="mb-1 block text-xs text-muted-foreground">
              Word #{idx + 1}
            </label>
            <Input
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={entries[i] ?? ""}
              onChange={(e) => onEntry(i, e.target.value)}
            />
          </div>
        ))}

        <Button className="w-full" disabled={!allMatch} onClick={onContinue}>
          Confirm
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function SetPassword({
  onSubmit,
  busy,
}: {
  onSubmit: (password: string) => void;
  busy: boolean;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit =
    password.length >= 8 && password === confirm && !busy;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a password</CardTitle>
        <CardDescription>
          This password encrypts the keystore file. It&apos;s not the
          mnemonic and it&apos;s not recoverable — if you forget it, you
          can still recover the wallet with the mnemonic.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Password
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
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

        <Button
          className="w-full"
          disabled={!canSubmit}
          onClick={() => onSubmit(password)}
        >
          {busy ? "Creating…" : "Create wallet"}
        </Button>
      </CardContent>
    </Card>
  );
}