"use client";

import Link from "next/link";
import { FC } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, FileKey, Plus } from "lucide-react";
import PageHeading from "../../PageHeading";

type props = {
  /**
   * Called when the user wants to switch to the import view
   * without leaving the session gate. When omitted, the
   * "import" affordance falls back to a link to `/wallet/import`.
   */
  onSwitchToImport?: () => void;
};

const NotLoaded: FC<props> = ({ onSwitchToImport }) => {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <PageHeading
        go_back_url="/"
        title="Wallet"
        subtitle="A wallet is a file on your device. It never leaves your browser unless you download it."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Plus className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="mt-2 text-lg">Create a new wallet</CardTitle>
            <CardDescription>
              Generate a fresh 24-word mnemonic. Write it down and store it
              offline — it's the only way to recover the wallet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/wallet/new"
              className={cn(buttonVariants(), "w-full")}
            >
              Create
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <FileKey className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="mt-2 text-lg">Import a wallet</CardTitle>
            <CardDescription>
              Paste a mnemonic or drop a keystore file. The same keystore
              works in the CLI and in the DEX.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {onSwitchToImport ? (
              <button
                type="button"
                onClick={onSwitchToImport}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full",
                )}
              >
                Import
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/wallet/import"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full",
                )}
              >
                Import
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Already have a keystore on this device?{" "}
        <Link
          href="/wallet"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Open the wallet
        </Link>
        .
      </p>
    </div>
  );
};

export default NotLoaded;