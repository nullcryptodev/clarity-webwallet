import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/lib/wallet";
import { KeystoreFile } from "@claritychain/wallet";
import { AlertTriangle, FileKey } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

function ImportKeystore() {
  const wallet = useWallet();
  const router = useRouter();

  const fileInput = useRef<HTMLInputElement>(null);
  const [keystore, setKeystore] = useState<KeystoreFile | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setKeystore(parsed);
      setFileName(file.name);
    } catch {
      setError("That file is not a valid keystore.");
      setKeystore(null);
      setFileName("");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void onFile(file);
  };

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void onFile(file);
  };

  const onUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keystore) return;
    setBusy(true);
    setError(null);
    try {
      await wallet.loadAndUnlock(keystore, password);
      router.push("/dex");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not unlock the keystore. Check the password.",
      );
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from keystore file</CardTitle>
        <CardDescription>
          Select the JSON file you downloaded when the wallet was
          created.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!keystore && (
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInput.current?.click()}
            className="cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors hover:border-foreground/50"
          >
            <FileKey className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">
              Drop your keystore file here
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              or click to browse
            </p>
            <input
              ref={fileInput}
              type="file"
              accept=".json,.keystore,application/json"
              onChange={onSelect}
              className="hidden"
            />
          </div>
        )}

        {keystore && (
          <form onSubmit={onUnlock} className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-4">
              <FileKey className="h-5 w-5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {fileName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {keystore.label ?? "unlabeled keystore"}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setKeystore(null);
                  setFileName("");
                  setPassword("");
                }}
              >
                Change
              </Button>
            </div>

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
              disabled={password.length === 0 || busy}
            >
              {busy ? "Unlocking…" : "Unlock"}
            </Button>
          </form>
        )}

        {error && !keystore && (
          <p className="mt-4 flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default ImportKeystore;