import BlocksOverview from "@/components/search/blocks/BlocksOverview"
import BlockTransactions from "@/components/search/blocks/BlockTransactions"

export default async function Page({
  params,
}: {
  params: Promise<{ height: string }>
}) {
  const { height } = await params

  return (
    <div className="flex flex-col gap-4 lg:gap-10 min-h-svh p-6">
      <div className="grid gap-2 lg:gap-10">
        <BlocksOverview height={height} />

        <BlockTransactions height={height} />
      </div>
    </div>
  )
}