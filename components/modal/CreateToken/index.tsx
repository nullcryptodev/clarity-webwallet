"use client";

import { useWallet } from "@/lib/wallet";
import NotReady from "../NotReady";
import CreateForm from "./CreateForm";
import { GlassDialog, GlassDialogContent } from "@/components/GlassDialog";

type props = {
  /** Controlled open state. */
  open: boolean;
  /** Controlled open-state setter. */
  onOpenChange: (open: boolean) => void;
  /**
   * Called after a successful create, before the modal closes.
   * The parent uses it to refresh a token list or navigate. The
   * modal itself only closes the dialog.
   */
  onCreated?: () => void;
};

export function CreateTokenModal({ open, onOpenChange, onCreated }: props) {
  const wallet = useWallet();
  const ready =
    wallet.isLoaded && wallet.isUnlocked && wallet.address !== null;

  return (
    <GlassDialog open={open} onOpenChange={onOpenChange}>
      <GlassDialogContent className="max-w-lg">
        {!ready ? (
          <NotReady />
        ) : (
            <CreateForm
            onCancel={() => onOpenChange(false)}
            onCreated={() => {
              onOpenChange(false);
              onCreated?.();
            }}
          />
        )}
      </GlassDialogContent>
    </GlassDialog>
  );
}