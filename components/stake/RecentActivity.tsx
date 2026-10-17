
import { humanTypeName, timeAgo } from "@claritychain/rpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { GlassCard } from "../GlassCard";

function RecentStakingActivity({
  entries,
}: {
  entries: {
    type: string;
    txHash: string;
    blockHeight: number;
  }[];
}) {
  const staking = entries.filter(
    (e) =>
      e.type === "opt_in_staking" ||
      e.type === "opt_out_staking" ||
      e.type === "claim_rewards",
  );

  if (staking.length === 0) return null;

  return (
    <GlassCard>
      <CardHeader>
        <CardTitle className="text-lg">Recent staking activity</CardTitle>
        <CardDescription>
          Opt-ins, opt-outs, and claims from this address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {staking.map((e) => (
            <li
              key={e.txHash}
              className="flex items-center justify-between py-3 text-sm"
            >
              <span>{humanTypeName(e.type)}</span>
              <div className="text-right text-xs text-muted-foreground">
                <div>#{e.blockHeight.toLocaleString()}</div>
                <div>{timeAgo(e.blockHeight.toString())}</div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </GlassCard>
  );
}

export default RecentStakingActivity;