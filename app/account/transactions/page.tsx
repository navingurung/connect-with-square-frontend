"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

import { MerchantSummaryCard } from "@/components/square/merchant-summary-card"
import { TransactionImportForm } from "@/components/square/transaction-import-form"
import { TransactionTable } from "@/components/square/transaction-table"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { SquareLocation, SquarePayment } from "@/lib/square-types"

const LOCATION_ID_KEY = "samurai_tax_location_id"

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-muted/30 px-6 py-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-72" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </CardContent>
            </Card>
          </div>
        </main>
      }
    >
      <TransactionsContent />
    </Suspense>
  )
}

function TransactionsContent() {
  const searchParams = useSearchParams()
  const urlLocationId = searchParams.get("locationId") ?? undefined

  // Fall back to localStorage so navigating back doesn't blank the page
  const [locationId, setLocationId] = useState<string | undefined>(urlLocationId)
  const [isResolvingLocation, setIsResolvingLocation] = useState(!urlLocationId)

  useEffect(() => {
    if (urlLocationId) {
      setLocationId(urlLocationId)
      setIsResolvingLocation(false)
    } else {
      const saved = localStorage.getItem(LOCATION_ID_KEY) ?? undefined
      setLocationId(saved)
      setIsResolvingLocation(false)
    }
  }, [urlLocationId])

  const [selectedPayments, setSelectedPayments] = useState<SquarePayment[]>([])
  const [selectedLocation, setSelectedLocation] =
    useState<SquareLocation | null>(null)
  const [transactionRefreshKey, setTransactionRefreshKey] = useState(0)

  const handleSyncComplete = useCallback(() => {
    setTransactionRefreshKey((current) => current + 1)
  }, [])

  if (isResolvingLocation || !locationId) {
    return (
      <main className="min-h-screen bg-muted/30 px-6 py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {selectedLocation?.name ? (
          <p className="text-sm text-muted-foreground">
            店舗：<span className="font-semibold text-foreground">{selectedLocation.name}</span>
          </p>
        ) : null}

        <MerchantSummaryCard onSyncComplete={handleSyncComplete} />

        <TransactionTable
          selectedPayments={selectedPayments}
          onSelectedPaymentsChange={setSelectedPayments}
          onLocationChange={setSelectedLocation}
          refreshKey={transactionRefreshKey}
          locationId={locationId}
        />

        {selectedLocation ? (
          <TransactionImportForm
            selectedPayments={selectedPayments}
            selectedLocation={selectedLocation}
          />
        ) : null}
      </div>
    </main>
  )
}