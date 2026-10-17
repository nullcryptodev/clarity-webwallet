"use client";

import { FC } from "react";
import Link from "next/link";
import { formatClrty, formatCount, hexToBigInt, Validator } from "@claritychain/rpc";
import Row from "@/components/Row";
import { GlassCard } from "@/components/GlassCard";

type Props = {
  validator: Validator;
};

const AddressValidator: FC<Props> = ({ validator }) => {
  const registeredAt = hexToBigInt(validator.registered_at_height);
  const lastInfraction = hexToBigInt(validator.last_infraction_height);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Validator</h3>
        <div className="flex gap-2">
          {validator.is_active && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-mono">
              Active
            </span>
          )}
          {validator.is_seed && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">
              Seed
            </span>
          )}
          {validator.is_offline && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-mono">
              Offline
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <Row label="Validator ID" value={formatCount(validator.id)}/>
        <Row label="Stake" value={formatClrty(validator.stake) + " $CLRTY"} />
        <Row label="Reward address" value={validator.reward_address}/>
        <Row label="Registered at" value={`Block #${formatCount(validator.registered_at_height)}`}/>
        <Row label="Blocks produced" value={formatCount(validator.total_blocks_produced)}/>
        <Row label="Total rewards earned" value={formatClrty(validator.total_rewards_earned) + " $CLRTY"}/>
        <Row label="Epochs active" value={formatCount(validator.epochs_active)}/>
        <Row label="Uptime" value={(validator.uptime_score / 100).toFixed(2) + "%"}/>
        <Row label="Reward multiplier" value={(validator.reward_multiplier / 100).toFixed(2) + "%"}/>
        <Row label="Last seen" value={`Block #${formatCount(validator.last_seen_height)}`}/>

        {validator.infraction_count > 0 && (
          <>
            <Row label="Infractions" value={validator.infraction_count}/>
            <Row label="Last infraction" value={`Block #${formatCount(validator.last_infraction_height)}`}/>
          </>
        )}

        <Row label="Consensus key" value={validator.consensus_key}/>

        {validator.node_key && (
          <Row label="Node key" value={validator.node_key}/>
        )}
      </div>
    </GlassCard>
  );
};

export default AddressValidator;