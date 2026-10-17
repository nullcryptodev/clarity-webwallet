import { Account, AmmPosition, Order, TokenBalancePair, TxWithLocation } from "@claritychain/rpc";

/**
 * Everything the address page fetches, bundled into one object.
 *
 * Each optional field is `null` when the corresponding fetch failed.
 * That is different from an empty array, which means the fetch
 * succeeded and there is nothing to show. The cards render the two
 * cases differently: `null` shows "not available", `[]` shows "none".
 */
export type AddressBundle = {
  account: Account;
  tokens: TokenBalancePair[] | null;
  positions: AmmPosition[] | null;
  orders: Order[] | null;
  transactions: TxWithLocation[] | null;
  validator: Validator | null;
};


export interface Validator {
  id: string;
  reward_address: string;
  consensus_key: string;   // signing key, NOT an address
  node_key: string;
  owner: string;
  registered_at_height: string;
  stake: string;
  uptime_score: number;          // bps
  last_ping_height: string;
  last_seen_height: string;
  reward_multiplier: number;     // bps, floor 2000
  infraction_count: number;
  last_infraction_height: string;
  total_blocks_produced: string;
  total_rewards_earned: string;
  epochs_active: string;
  is_seed: boolean;
  is_active: boolean;
  became_active_at: string;
  last_active_at: string;
  can_be_active: boolean;        // derived
  meets_stake_req: boolean;      // derived
  is_offline: boolean;           // derived, needs current height
}