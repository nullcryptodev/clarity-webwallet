import TokenDetail from "@/components/search/tokens/Detail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="h-full flex flex-col">
      <TokenDetail tokenId={id} />
    </div>
  );
}