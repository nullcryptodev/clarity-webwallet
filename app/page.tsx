"use client"
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  Coins,
  Droplets,
  KeyRound,
  LineChart,
  ShieldCheck,
  Wallet as WalletIcon,
} from "lucide-react";
import { useWallet } from "@/lib/wallet";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Hero />
      <Capabilities />
      <EntryPoints />
      <Footer />
    </div>
  );
}

function Hero() {
  const wallet = useWallet();

  return (
    <section className="relative flex flex-col items-center justify-center px-6 py-24 text-center">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('blue-waves.png')" }}
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 -z-10 bg-background/70"
        aria-hidden="true"
      />

      <h1 className="mt-6 max-w-2xl text-5xl font-bold tracking-tight">
        Your keys, your tokens, your proofs
      </h1>

      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        A browser wallet for Clarity. It holds your keystore, signs
        your transactions locally, and verifies every balance against
        a state root that two independent nodes agree on.
        <br />
        The node never sees your keys. The node never has to be
        trusted with your balance.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/wallet/new">
          <Button size="lg">
            Create a wallet <ArrowRight />
          </Button>
        </Link>

        <Link href="/wallet/import">
          <Button variant="outline" size="lg">
            Import a wallet
          </Button>
        </Link>

        <Link href="/wallet">
          <Button variant="outline" size="lg">
            Load wallet
          </Button>
        </Link>
      </div>
    </section>
  );
}

function Capabilities() {
  const features = [
    {
      icon: KeyRound,
      title: "Keys that never leave the tab",
      body:
        "Your keystore is encrypted with Argon2id and decrypted only in memory. Signing happens locally; the wallet never sends a private key to a node.",
    },
    {
      icon: ShieldCheck,
      title: "Balances you can verify",
      body:
        "Every balance is proven against the state root, not read from the server's word. Two independent RPC endpoints must agree on the root before either is trusted.",
    },
    {
      icon: Coins,
      title: "Tokens, NFTs, and staking in one place",
      body:
        "Create and manage tokens, mint and wrap NFTs, stake CLRTY, register as a validator, and rotate a consensus key — all from one address book.",
    },
    {
      icon: Droplets,
      title: "A DEX that inherits your wallet",
      body:
        "The DEX reads the tokens you hold from your wallet. Create a pool, add liquidity, or place an order without re-importing a keystore or re-approving a token.",
    },
    {
      icon: LineChart,
      title: "A trading book you can watch",
      body:
        "Passive orders rest in a price-time-priority book; Active orders route against an AMM pool. Both are first-class state, owned by your address, queryable by your wallet.",
    },
    {
      icon: WalletIcon,
      title: "One keystore, every Clarity app",
      body:
        "The same encrypted file works in the browser, the CLI wallet, and the address utility. Back up one file, restore everywhere.",
    },
  ];

  return (
    <section className="border-t px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-semibold">
          What the wallet does
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          A signing device and a state verifier, not a custodial service.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle className="mt-2 flex items-center gap-2 text-lg">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{body}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function EntryPoints() {
  return (
    <section className="border-t px-6 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-semibold">Two ways to start</h2>
        <p className="mt-2 text-muted-foreground">
          Both paths produce the same keystore file. Neither sends a
          mnemonic anywhere.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>New to Clarity</CardTitle>
              <CardDescription>
                Generate a fresh 24-word mnemonic in your browser. Write
                it down before you navigate away; the wallet cannot
                recover it for you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/wallet/new">
                <Button className="w-full">Create a wallet</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Already have a keystore</CardTitle>
              <CardDescription>
                Import a keystore file, a mnemonic, or a backup from the
                CLI wallet. The same file unlocks every Clarity surface.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Link href="/wallet/import">
                <Button variant="outline" className="w-full">
                  Import a wallet
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">
              What the wallet will never do:
            </strong>{" "}
            send your mnemonic to a server, store your password, sign
            a transaction you haven&apos;t seen, or report a balance
            it hasn&apos;t proven against a state root.
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t px-6 py-6">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>Clarity Wallet</span>
        <span>Local keys · Proof-verified balances · No smart contracts</span>
      </div>
    </footer>
  );
}