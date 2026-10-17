"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  FileKey,
  KeyRound,
} from "lucide-react";
import ImportMnemonic from "@/components/wallet/ImportMnemonic";
import ImportKeystore from "@/components/wallet/ImportKeystore";
import PageHeading from "@/components/PageHeading";

type Tab = "mnemonic" | "keystore";

export default function ImportWalletPage() {
  const [tab, setTab] = useState<Tab>("mnemonic");

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8 flex items-center gap-4">
        <PageHeading
          go_back_url="/"
          title="Import"
          subtitle="Import a wallet using your mnemonic key or keystore json file"
        />
      </div>

      <div className="mb-6 flex gap-2">
        <Button
          variant={tab === "mnemonic" ? "default" : "outline"}
          onClick={() => setTab("mnemonic")}
        >
          <KeyRound className="mr-2 h-4 w-4" />
          Mnemonic
        </Button>
        <Button
          variant={tab === "keystore" ? "default" : "outline"}
          onClick={() => setTab("keystore")}
        >
          <FileKey className="mr-2 h-4 w-4" />
          Keystore file
        </Button>
      </div>

      {tab === "mnemonic" && <ImportMnemonic />}

      {tab === "keystore" && <ImportKeystore />}
    </div>
  );
}
