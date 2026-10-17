"use client";

import { useWallet } from "@/lib/wallet";
import { useValidatorForAddress } from "@/lib/hooks";
import Register from "@/components/validator/Register";
import ManageValidator from "@/components/validator/Manage";

export default function ValidatorPage() {
  const wallet = useWallet();
  const validator = useValidatorForAddress(wallet.address);

  return (
    <div className="flex flex-col gap-4 p-4">
      {validator.loading && !validator.data && (
        <p className="text-muted-foreground">Loading validator…</p>
      )}
      {!validator.loading && !validator.data && (
        <Register />
      )}
      {validator.data && (
        <ManageValidator validator={validator.data} />
      )}
    </div>
  );
}