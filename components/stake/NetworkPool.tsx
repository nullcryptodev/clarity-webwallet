import { bigIntToHex, formatApyBps, formatClrty, formatCount, hexToBigInt, StakingInfo } from "@claritychain/rpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Coins } from "lucide-react";
import Stat from "../Stat";
import { GlassCard } from "../GlassCard";

function NetworkPool({
  network,
  epoch,
  loading,
}: {
  network: StakingInfo | null;
  epoch: unknown;
  loading: boolean;
}) {
  // Parse the hex wire values once, at the top of the component.
  // Everything below uses the parsed values, and the display
  // functions get the wire form back via bigIntToHex.
  const apyBps = network ? hexToBigInt(network.last_effective_apy_bps) : 0n;
  const totalStaked = network ? hexToBigInt(network.total_staked) : 0n;
  const pot = network ? hexToBigInt(network.current_pot) : 0n;

  return (
    <GlassCard>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Coins className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">The network</CardTitle>
            <CardDescription>
              Every epoch, block rewards are split between the validators
              who produced them and the pool that pays stakers.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 mt-2">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Effective APY"
            value={
              loading && !network
                ? "…"
                : formatApyBps(apyBps)
            }
          />
          <Stat
            label="Total staked"
            value={
              loading && !network
                ? "…"
                : `${formatClrty(bigIntToHex(totalStaked))} CLRTY`
            }
          />
          <Stat
            label="Stakers"
            value={
              loading && !network
                ? "…"
                : formatCount(network?.staker_count ?? "0x0")
            }
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Stat
            label="Reward pool"
            value={
              loading && !network
                ? "…"
                : `${formatClrty(bigIntToHex(pot))} CLRTY`
            }
          />
          <Stat
            label="Stakers paid from"
            value="Accumulated pot, released each epoch"
          />
        </div>

        <p className="text-sm text-muted-foreground">
          The effective APY is a smoothed estimate. It rises with network
          activity and falls when the pot is full. The block reward is split
          40% for stakers and 60% for validators.
        </p>
      </CardContent>
    </GlassCard>
  );
}

export default NetworkPool;