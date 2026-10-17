"use client";

import { FC, useEffect, useState } from "react";
import { hexToBigInt, RpcError } from "@claritychain/rpc";

import { rpc } from "@/lib/rpc";

import { AddressBundle } from "./types";
import AddressHeader from "./Header";
import AddressOverview from "./Overview";
import AddressTokens from "./Tokens";
import AddressStaking from "./Staking";
import AddressValidator from "./Validator";
import AddressPositions from "./Positions";
import AddressOrders from "./Orders";
import AddressTransactions from "./Transactions";

type Props = {
  address: string;
};

const AddressDetail: FC<Props> = ({ address }) => {
  const [bundle, setBundle] = useState<AddressBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        //  The account fetch is the only one whose failure is fatal —
        //  without it there's nothing to render. Everything else is
        //  best-effort: a failure on any of them just leaves that
        //  card in the "not available" state.
        const account = await rpc.getAccount(address);
        if (cancelled) return;

        //  Validator lookup runs in parallel with the rest and never
        //  blocks the main path. A miss is normal (most addresses are
        //  not validators) and shouldn't be distinguished from an
        //  RPC failure — the card is a bonus either way.
        const validatorPromise = rpc.getValidatorByAddress(address).catch(() => null);

        const [tokensResult, positionsResult, ordersResult, txsResult] =
          await Promise.allSettled([
            rpc.getTokensForAddress(address),
            rpc.getPositionsForAddress(address),
            rpc.getOrdersForAddress(address),
            rpc.getTransactionsForAddress(address, 20),
          ]);

        if (cancelled) return;

        const validator = await validatorPromise;
        if (cancelled) return;

        setBundle({
          account,
          tokens:
            tokensResult.status === "fulfilled"
              ? tokensResult.value.tokens
              : null,
          positions:
            positionsResult.status === "fulfilled"
              ? positionsResult.value.positions
              : null,
          orders:
            ordersResult.status === "fulfilled"
              ? ordersResult.value.orders
              : null,
          transactions:
            txsResult.status === "fulfilled"
              ? txsResult.value.transactions
              : null,
          validator,
        });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof RpcError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Could not reach the node");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-card border rounded-xl p-4">
          <div className="text-sm text-muted-foreground">Loading address…</div>
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-card border rounded-xl p-4">
          <div className="text-sm text-destructive">
            {error ?? "Address not found"}
          </div>
        </div>
      </div>
    );
  }

  const { account, tokens, positions, orders, transactions, validator } =
    bundle;

  //  An account with no balance, no stake, no rewards, and no nonce
  //  has never been touched. A nonce > 0 means it has sent something
  //  in the past, even if it currently holds nothing.
  const isEmpty =
    hexToBigInt(account.balance) === BigInt(0) &&
    hexToBigInt(account.pending_rewards) === BigInt(0) &&
    hexToBigInt(account.staked) === BigInt(0) &&
    hexToBigInt(account.nonce) === BigInt(0) &&
    !account.staking_opted_out;

  return (
    <div className="flex flex-col gap-4">
      <AddressHeader
        address={address}
        isEmpty={isEmpty}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AddressOverview account={account} isEmpty={isEmpty} isValidator={validator !== null} />
        <AddressTokens tokens={tokens} />
      </div>

      {!isEmpty && <AddressStaking account={account} />}

      {validator && <AddressValidator validator={validator} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <AddressPositions positions={positions} />
        <AddressOrders orders={orders} />
      </div>
      <AddressTransactions address={address} transactions={transactions} />
    </div>
  );
};

export default AddressDetail;