import { TransactionDetailCard } from "@/components/square/transaction-detail-card"

type TransactionDetailPageProps = {
  params: Promise<{
    paymentId: string
  }>
  searchParams: Promise<{
    locationId?: string
  }>
}

export default async function TransactionDetailPage({
  params,
  searchParams,
}: TransactionDetailPageProps) {
  const { paymentId } = await params
  const { locationId } = await searchParams

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <TransactionDetailCard paymentId={paymentId} locationId={locationId} />
      </div>
    </main>
  )
}