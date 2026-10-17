"use client"
import { FC, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { Card, CardContent } from "../ui/card";
import { AlertTriangle, Download } from "lucide-react";
import { Button } from "../ui/button";


const Backup: FC = () => {
  const wallet = useWallet();
  const [downloaded, setDownloaded] = useState(false);

  const onDownload = () => {
    const file = wallet.keystoreFile();
    if (!file) return;
    const blob = new Blob([JSON.stringify(file, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const label = file.label ?? "clarity-wallet";
    a.download = `${label}.keystore.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };

  return (
    <Card className="border-yellow-500/50">
      <CardContent className="flex flex-wrap items-start gap-4 pt-6">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
        <div className="flex-1 space-y-2 text-sm">
          <p className="font-medium">Back up your wallet</p>
          <p className="text-muted-foreground">
            Download the keystore file and store it somewhere safe. If you
            lose the file and the mnemonic, you lose access to the wallet.
            There is no recovery.
          </p>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            {downloaded ? "Downloaded" : "Download keystore"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default Backup;