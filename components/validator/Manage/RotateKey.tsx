"use client";

import { FC, useState } from "react";
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
  useSubmitTx,
  TX_CONSTANTS,
  currentNonce,
} from "@/lib/use-submit-tx";
import { TxBuilder, hexToBigInt, shortAddress } from "@claritychain/rpc";
import type { Validator } from "@claritychain/rpc";
import {
  AlertTriangle,
  Check,
  Copy,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import { bytesToHex } from "@noble/hashes/utils.js";

type props = {
  validator: Validator;
}

const RotateKey: FC <props> = ({ validator }) => {
  const wallet = useWallet();
  const { submit, submitting, error, clearError } = useSubmitTx();

  const [newSecret, setNewSecret] = useState<Uint8Array | null>(null);
  const [newPublic, setNewPublic] = useState<Uint8Array | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const generateKeypair = async () => {
    // Ed25519 keypair generation. Web Crypto's Ed25519 support
    // varies; if it's unavailable, fall back to the wallet
    // package's derivation from a fresh mnemonic. For v1, this
    // uses Web Crypto and assumes it exists. If the target
    // browsers don't support it, swap in a pure-JS Ed25519
    // implementation (e.g. @noble/ed25519).
    const pair = (await crypto.subtle.generateKey(
      { name: "Ed25519" },
      true,
      ["sign", "verify"],
    )) as CryptoKeyPair;

    const publicKey = new Uint8Array(
      (await crypto.subtle.exportKey("raw", pair.publicKey)) as ArrayBuffer,
    );
    const pkcs8 = new Uint8Array(
      (await crypto.subtle.exportKey("pkcs8", pair.privateKey)) as ArrayBuffer,
    );
    // PKCS8 for Ed25519 is 48 bytes; the last 32 are the seed.
    // This is the extraction the daemon's --consensus-key flag
    // expects.
    const secret = pkcs8.slice(pkcs8.length - 32);

    setNewSecret(secret);
    setNewPublic(publicKey);
  };

  const reset = () => {
    setNewSecret(null);
    setNewPublic(null);
    setSecretCopied(false);
    setConfirmed(false);
  };

  const copySecret = async () => {
    if (!newSecret) return;
    await navigator.clipboard.writeText(bytesToHex(newSecret));
    setSecretCopied(true);
    setTimeout(() => {
      navigator.clipboard.writeText("").catch(() => { });
    }, 30_000);
  };

  const onRotate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const from = wallet.address;
    if (!from || !newPublic) return;

    try {
      const nonce = await currentNonce(from);
      const unsigned = TxBuilder.rotateConsensusKey({
        from,
        fee: TX_CONSTANTS.fee,
        nonce,
        chainId: TX_CONSTANTS.chainId,
        newConsensusKey: newPublic,
      });
      await submit(unsigned, true);
      reset();
    } catch {
      // submit() already set the error.
    }
  };

  const currentKey = validator.consensus_key;

  return (
    <Card className="border-blue-500/40">
      <CardHeader>
        <div className="flex items-center gap-3">
          <KeyRound className="h-5 w-5 text-blue-500" />
          <div>
            <CardTitle className="text-lg">Rotate consensus key</CardTitle>
            <CardDescription>
              Change the signing key your validator uses for consensus
              messages. The old key remains valid for verifying
              signatures cast at earlier heights, which is what
              preserves the slashing machinery across rotation.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <div className="text-xs text-muted-foreground">
            Current consensus key
          </div>
          <div className="break-all font-mono text-xs">
            {currentKey}
          </div>
        </div>

        {!newSecret && !newPublic && (
          <>
            <div className="rounded-md border border-yellow-500/40 bg-yellow-500/5 p-3 text-xs text-yellow-700 dark:text-yellow-500">
              <p className="font-medium">Before you rotate</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li>
                  The new secret key is shown to you exactly once. If
                  you lose it before configuring your daemon, your
                  validator stops signing and you&apos;ll need to rotate
                  again.
                </li>
                <li>
                  Rotation takes effect immediately. The old key stops
                  signing new messages; it remains valid only for
                  verifying past signatures.
                </li>
                <li>
                  Configure the daemon with{" "}
                  <code className="font-mono">--consensus-key</code>{" "}
                  before the next consensus round, or your validator
                  will miss votes.
                </li>
              </ul>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={generateKeypair}
              disabled={submitting}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Generate a new keypair
            </Button>
          </>
        )}

        {newSecret && newPublic && (
          <form onSubmit={onRotate} className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              <div className="text-xs text-muted-foreground">
                New consensus public key
              </div>
              <div className="mt-1 break-all font-mono text-xs">
                {bytesToHex(newPublic)}
              </div>
            </div>

            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-destructive">
                  New consensus SECRET key — copy this now
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={copySecret}
                >
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  {secretCopied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="mt-1 break-all font-mono text-xs">
                {bytesToHex(newSecret)}
              </div>
              <p className="mt-2 text-xs text-destructive">
                This is the only time this value will be shown. Store
                it somewhere safe before submitting the rotation.
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={submitting}
                className="mt-1"
              />
              <span className="text-muted-foreground">
                I have copied the new secret key and will configure my
                daemon with it.
              </span>
            </label>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={!confirmed || submitting}
              >
                {submitting ? "Rotating…" : "Submit rotation"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={reset}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default RotateKey;