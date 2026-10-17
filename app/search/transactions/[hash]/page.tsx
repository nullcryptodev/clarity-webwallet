import TransactionDetail from "@/components/search/transactions/Detail";

export default async function Page({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;

  return (
    <div className="flex flex-col gap-4 lg:gap-10 min-h-svh p-6">
      <div className="grid gap-2 lg:gap-10">
        <TransactionDetail hash={hash} />
      </div>
    </div>
  );
}