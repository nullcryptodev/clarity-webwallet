"use client";

import { FC } from "react";
import { Account, formatClrty, formatCount, hexToBigInt } from "@claritychain/rpc";
import Row from "@/components/Row";
import { GlassCard } from "@/components/GlassCard";

type Props = {
  account: Account;
};

const AddressStaking: FC<Props> = ({ account }) => {
  const staked = hexToBigInt(account.staked);
  const stakerSince = hexToBigInt(account.staker_since_height);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">Staking</h2>
        <div className="flex gap-2">
          {account.staking_opted_out ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-mono">
              Opted Out
            </span>
            ) : staked > BigInt(0) ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-mono">
              Earning
            </span>
            ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-mono">
              Below threshold
            </span>
            )
          }
        </div>
      </div>
      <h3 className="font-medium mb-4">Staking</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <Row label="Staked" value={formatClrty(account.staked) + " $CLRTY"}/>
        <Row label="Pending rewards" value={formatClrty(account.pending_rewards) + " $CLRTY"}/>
        <Row label="Staker since" value={stakerSince === BigInt(0) ? "—" : `Block #${formatCount(account.staker_since_height)}`}/>
        <Row label="Last reward epoch" value={formatCount(account.last_reward_epoch)}/>
      </div>
    </GlassCard>
  );
};

export default AddressStaking;