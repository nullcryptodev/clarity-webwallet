"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useWallet } from "@/lib/wallet";
import { useYourBalances, useNftsForOwner, useAccount } from "@/lib/hooks";
import {
  useSubmitTx,
  TX_CONSTANTS,
  currentNonce,
  type SubmitResult,
} from "@/lib/use-submit-tx";
import {
  TxBuilder,
  formatClrty,
  formatTokenAmount,
  bigIntToHex,
  hexToBigInt,
  shortAddress,
} from "@claritychain/rpc";
import type { Account, NftInfo } from "@claritychain/rpc";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Coins,
  Image as ImageIcon,
  Send,
} from "lucide-react";
import { decodeAddress } from "@/lib/address";
import { GlassDialog, GlassDialogContent, GlassDialogDescription, GlassDialogHeader, GlassDialogTitle } from "../../GlassDialog";
import { GlassCard } from "../../GlassCard";
import { GlassButton } from "../../GlassButton";
import { cn } from "cn";
import NotReady from "../NotReady";
import SendForm from "./SendForm";

export interface SendModalProps {
  /** Controlled open state. */
  open: boolean;
  /** Controlled open-state setter. */
  onOpenChange: (open: boolean) => void;
  /** Optional preset recipient address. */
  initialRecipient?: string;
}

export function SendModal({
  open,
  onOpenChange,
  initialRecipient,
}: SendModalProps) {
  const wallet = useWallet();
  const ready = wallet.isLoaded && wallet.isUnlocked && wallet.address !== null;

  return (
    <GlassDialog open={open} onOpenChange={onOpenChange}>
      <GlassDialogContent>
        {!ready ? ( // shouldn't really happen
          <NotReady />
        ) : (
          <SendForm
            initialRecipient={initialRecipient}
            onClose={() => onOpenChange(false)}
          />
        )}
      </GlassDialogContent>
    </GlassDialog>
  );
}
