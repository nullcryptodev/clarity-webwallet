import { GlassCard } from "@/components/GlassCard";
import Search from "@/components/search";
import ChainOverview from "@/components/search/ChainOverview";
import LatestBlocks from "@/components/search/LatestBlocks";
import LatestTransactions from "@/components/search/LatestTransactions";

export default function Page() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Search />
      <ChainOverview />

      <div className="mt-2 grid lg:grid-cols-2 gap-4 items-start">
        <LatestBlocks />
        <LatestTransactions />
      </div>
    </div>
  );
}