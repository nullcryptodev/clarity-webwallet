import { useAccount } from "@/lib/hooks";
import { currentNonce, TX_CONSTANTS, useSubmitTx } from "@/lib/use-submit-tx";
import { parseAmount, parseHex32 } from "@/lib/utils";
import { validateNodeKey, validateStake } from "@/lib/validate";
import { useWallet } from "@/lib/wallet";
import { bigIntToHex, formatClrty, hexToBigInt, TxBuilder, UNBONDING_PERIOD, VALIDATOR_MIN_STAKE } from "@claritychain/rpc";
import { FC, useMemo, useState } from "react";
import PageHeading from "../PageHeading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Input } from "../ui/input";
import { ErrorNote } from "../ErrorNote";
import { Button } from "../ui/button";
import { GlassCard } from "../GlassCard";


const Register: FC = () => {
  const wallet = useWallet();
  const account = useAccount(wallet.address);
  const { submit, submitting, error, clearError } = useSubmitTx();

  const [nodeKeyHex, setNodeKeyHex] = useState("");
  const [stake, setStake] = useState("");

  const nodeKey = useMemo(() => parseHex32(nodeKeyHex), [nodeKeyHex]);
  const nodeKeyError = useMemo(
    () => validateNodeKey(nodeKeyHex),
    [nodeKeyHex],
  );
  const stakeError = useMemo(
    () => validateStake(stake, account.data),
    [stake, account.data],
  );

  const canSubmit =
    wallet.address !== null &&
    nodeKey !== null &&
    nodeKeyError === null &&
    stake.length > 0 &&
    stakeError === null &&
    !submitting;

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const from = wallet.address;
    if (!from || nodeKey === null) return;
    const s = parseAmount(stake, 18);
    if (s === null) return;

    try {
      const nonce = await currentNonce(from);
      const unsigned = TxBuilder.registerValidator({
        from,
        fee: TX_CONSTANTS.fee,
        nonce,
        chainId: TX_CONSTANTS.chainId,
        nodeKey,
        stake: s,
      });
      await submit(unsigned, true);
    } catch {
      // submit() already set the error.
    }
  };

  return (
    <div>
      <PageHeading
        go_back_url="/wallet"
        title="Register as a validator"
        subtitle="Stake CLRTY and provide a node key. Registration does not require the consensus key; that key is configured on the daemon and can be rotated later."
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard className="mb-6">
          <CardHeader>
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="mt-2 text-lg">Prerequisites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-muted-foreground">·</span>
              <span>
                At least{" "}
                <strong>
                  {formatClrty(bigIntToHex(BigInt(VALIDATOR_MIN_STAKE)))}{" "}
                  CLRTY
                </strong>{" "}
                of stake. The stake is locked while the validator is
                active and for {UNBONDING_PERIOD} blocks after
                unregistering.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-muted-foreground">·</span>
              <span>
                A 32-byte node key. This is the key your daemon uses to
                identify itself on the P2P network. Generate it with{" "}
                <code className="font-mono bg-card px-2">address --show-secret</code>{" "}
                if you have a keystore on disk.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-muted-foreground">·</span>
              <span>
                A separate consensus key configured on the daemon. You do
                not provide it here; the daemon reads it from{" "}
                <code className="font-mono">--consensus-key</code> and can
                rotate it later via this page.
              </span>
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardHeader>
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="mt-2 text-lg">Register</CardTitle>
            <CardDescription>
              The reward address for your validator is the connected
              wallet&apos;s address. You can change it later with
              Update reward address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onRegister} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Node key (32 bytes, hex)
                </label>
                <Input
                  value={nodeKeyHex}
                  onChange={(e) => setNodeKeyHex(e.target.value.trim())}
                  placeholder="0x…"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  className="font-mono text-sm"
                  disabled={submitting}
                />
                {nodeKeyHex.length > 0 && nodeKeyError && (
                  <p className="mt-1 text-xs text-destructive">
                    {nodeKeyError}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Stake (CLRTY)
                </label>
                <Input
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  placeholder="0.0"
                  inputMode="decimal"
                  disabled={submitting}
                />
                {stake.length > 0 && stakeError && (
                  <p className="mt-1 text-xs text-destructive">{stakeError}</p>
                )}
                {account.data && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Available:{" "}
                    {formatClrty(
                      bigIntToHex(hexToBigInt(account.data.balance)),
                    )}{" "}
                    CLRTY
                  </p>
                )}
              </div>

              {error && <ErrorNote message={error} />}

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {submitting ? "Registering…" : "Register validator"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </GlassCard>
      </div>
    </div>
  );
}

export default Register;