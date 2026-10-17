import { useAccount, useEpochInfo, useStakingInfo, useValidators, useYourTransactions } from "@/lib/hooks";
import { useWallet } from "@/lib/wallet";
import PageHeading from "../PageHeading";
import YourStake from "./YourStake";
import NetworkPool from "./NetworkPool";
import ActiveValidators from "./ActiveValidators";
import RecentStakingActivity from "./RecentActivity";

function StakeContent() {
  const wallet = useWallet();
  const account = useAccount(wallet.address);
  const network = useStakingInfo();
  const epoch = useEpochInfo();
  const validators = useValidators({ activeOnly: true, limit: 10 });
  const activity = useYourTransactions(5);

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeading
        go_back_url="/wallet"
        title="Stake"
        subtitle="Stake CLRTY to earn a share of every block reward."
      />

      <YourStake account={account.data} loading={account.loading} />

      <NetworkPool
        network={network.data}
        epoch={epoch.data}
        loading={network.loading}
      />

      <ActiveValidators
        validators={validators.data ?? []}
        loading={validators.loading}
      />

      <RecentStakingActivity entries={activity.data ?? []} />
    </div>
  );
}

export default StakeContent;