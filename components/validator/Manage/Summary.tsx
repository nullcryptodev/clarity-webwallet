import Stat from "@/components/Stat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveSet, useValidatorStats } from "@/lib/hooks";
import { bigIntToHex, formatClrty, formatCount, hexToBigInt, shortAddress, Validator } from "@claritychain/rpc";
import { ShieldCheck } from "lucide-react";
import { FC } from "react";

type props = {
  validator: Validator;
}

const Summary: FC <props> = ({ validator }) => {
  const stats = useValidatorStats(hexToBigInt(validator.id));
  const activeSet = useActiveSet();

  const id = hexToBigInt(validator.id);
  const stake = hexToBigInt(validator.stake);
  const rewards = hexToBigInt(validator.total_rewards_earned);
  const blocks = hexToBigInt(validator.total_blocks_produced);

  const activeIds = (activeSet.data?.ids ?? []).map((s) => hexToBigInt(s));
  const inActiveSet = activeIds.some((x) => x === id);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">Summary</CardTitle>
            <CardDescription>
              {validator.is_offline
                ? "Your validator is currently offline."
                : validator.is_active
                  ? "Your validator is active and producing blocks."
                  : validator.can_be_active
                    ? "Your validator is eligible to be in the active set."
                    : "Your validator is not in the active set."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Stat
            label="Stake"
            value={`${formatClrty(bigIntToHex(stake))} CLRTY`}
          />
          <Stat
            label="Status"
            value={
              inActiveSet
                ? "In active set"
                : validator.is_active
                  ? "Active"
                  : "Inactive"
            }
          />
          <Stat
            label="Blocks produced"
            value={formatCount(validator.total_blocks_produced)}
          />
          <Stat
            label="Total rewards"
            value={`${formatClrty(bigIntToHex(rewards))} CLRTY`}
          />
          <Stat
            label="Uptime"
            value={`${(validator.uptime_score / 100).toFixed(2)}%`}
          />
          <Stat
            label="Reward multiplier"
            value={`${(validator.reward_multiplier / 100).toFixed(2)}×`}
          />
        </div>

        <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <span className="text-muted-foreground">Reward address</span>
            <span className="break-all font-mono text-xs">
              {validator.reward_address}
            </span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <span className="text-muted-foreground">Consensus key</span>
            <span className="break-all font-mono text-xs">
              {shortAddress(validator.consensus_key)}
            </span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <span className="text-muted-foreground">Node key</span>
            <span className="break-all font-mono text-xs">
              {shortAddress(validator.node_key)}
            </span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <span className="text-muted-foreground">Owner</span>
            <span className="break-all font-mono text-xs">
              {shortAddress(validator.owner)}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          The consensus key shown here is the current effective key.
          Its full history — every key this validator has used and the
          height range each was authoritative for — is stored on chain
          and is what the slashing machinery verifies against.
        </p>
      </CardContent>
    </Card>
  );
}

export default Summary;