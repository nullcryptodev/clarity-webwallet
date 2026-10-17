import AddressDetail from "@/components/search/address/Detail";

export default async function Page({
  params,
}: {
  params: Promise<{ addr: string }>;
}) {
  const { addr } = await params;

  return (
    <div className="flex flex-col gap-4 lg:gap-10 min-h-svh p-6">
      <div className="grid gap-2 lg:gap-10">
        <AddressDetail address={addr} />
      </div>
    </div>
  );
}