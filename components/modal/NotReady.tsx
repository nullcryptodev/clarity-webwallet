import { FC } from "react";
import Link from "next/link";

import { GlassDialogDescription, GlassDialogHeader, GlassDialogTitle } from "@/components/GlassDialog";
import { Button } from "@/components/ui/button";

const NotReady: FC = () => (
  <>
    <GlassDialogHeader>
      <GlassDialogTitle>Send</GlassDialogTitle>
      <GlassDialogDescription>
        Unlock a wallet to send CLRTY, a token, or an NFT.
      </GlassDialogDescription>
    </GlassDialogHeader>

    <div className="flex gap-2 pt-4">
      <Link href="/wallet">
        <Button variant="outline">Go to wallet</Button>
      </Link>
    </div>
  </>
);
export default NotReady