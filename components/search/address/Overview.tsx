"use client";

import { FC } from "react";
import Link from "next/link";
import { Account, bigIntToHex, formatClrty, formatCount, hexToBigInt } from "@claritychain/rpc";
import Row from "@/components/Row";
import { GlassCard } from "@/components/GlassCard";

type Props = {
  account: Account;
  isEmpty: boolean;
  isValidator: boolean;
};

const AddressOverview: FC<Props> = ({ account, isEmpty, isValidator }) => {
  const totalValueHex = bigIntToHex(
    hexToBigInt(account.balance) + hexToBigInt(account.pending_rewards),
  );

  const createdHeight = hexToBigInt(account.created_at_height);
  const neverTouched = createdHeight === BigInt(0) && isEmpty;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">Overview</h2>
        <div className="flex gap-2">
          {!isEmpty && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-mono">
              Active
            </span>
          )}
          {isValidator && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">
              Validator
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <Row label="Balance" value={formatClrty(account.balance)}/>
        <Row label="Total value" value={formatClrty(totalValueHex) + " $CLRTY"}/>
        <Row label="Nonce" value={formatCount(account.nonce)}/>
        <Row label="Created at" value={neverTouched ? "Never Touched" : `Block #${formatCount(account.created_at_height)}`}/>
      </div>
    </GlassCard>
  );
};

export default AddressOverview;