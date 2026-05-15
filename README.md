## Frontend SetUp
1. Create Next.js app

```bash
npx create-next-app@latest ./
```

2. Setup shadcn/ui

```bash
npx shadcn@latest init
```

3. Add required shadcn components

```bash
npx shadcn@latest add button card badge switch separator table dropdown-menu alert-dialog skeleton
```

> Also install icons and axios:

```bash
npm install lucide-react axios
```

4. Create env file

```bash
touch .env.local
```

---

5. Create folders

```bash
mkdir -p app/account/connect
mkdir -p 'app/account/transactions/[paymentId]'
mkdir -p app/account/manage
mkdir -p components/square
mkdir -p lib
mkdir -p public/images
```

## Summary
- > app/account/connect → Connect with Square page
- > app/account/transactions → Square transaction list page
- > app/account/transactions/[paymentId] → Transaction detail page for one selected payment
- > app/account/manage → Manage Square connection page
- > components/square → Reusable Square UI components
- > lib → API, types, formatters, helpers
- > public/images → Logos and static images


```bash
square-samurai-frontend/
├── app/
│   ├── account/
│   │   ├── connect/
│   │   │   └── page.tsx
│   │   ├── transactions/
│   │   │   ├── page.tsx
│   │   │   └── [paymentId]/
│   │   │       └── page.tsx
│   │   └── manage/
│   │       └── page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   ├── square/
│   └── ui/
│
├── lib/
└── public/
    └── images/

```

---

6. Clean root page

on `app/page.tsx`
- when the user opens the app root page /, they are automatically sent to the first page: /account/connect.

```typescript
import { redirect } from "next/navigation"

export default function HomePage() {
  redirect("/account/connect")
}

```

---

7. Create Connect placeholder page

on app/account/connect/page.tsx

```tsx
export default function ConnectPage() {
  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
        <div className="rounded-xl border bg-background p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Connect with Square</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Square OAuth connect page will be built here.
          </p>
        </div>
      </div>
    </main>
  )
}

```

8. Create Transactions placeholder page

on `app/account/transactions/page.tsx`
```tsx
export default function TransactionsPage() {
  return (
    <main className="min-h-screen bg-muted/30 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Square merchant summary and transaction list will be built here.
        </p>
      </div>
    </main>
  )
}

```

---

9. Create Transaction detail placeholder page
on `app/account/transactions/[paymentId]/page.tsx`

```tsx
type TransactionDetailPageProps = {
  params: Promise<{
    paymentId: string
  }>
}

export default async function TransactionDetailPage({
  params,
}: TransactionDetailPageProps) {
  const { paymentId } = await params

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold">Transaction Detail</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Payment ID: {paymentId}
        </p>
      </div>
    </main>
  )
}

```

10. Create Manage placeholder page
on `app/account/manage/page.tsx`

```tsx
export default function ManagePage() {
  return (
    <main className="min-h-screen bg-muted/30 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold">Manage Square Account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Automatic Syncing, Disconnect Account, and Delete Account will be built here.
        </p>
      </div>
    </main>
  )
}
```

### Check these URLs:

```bash
http://localhost:3000
http://localhost:3000/account/connect
http://localhost:3000/account/transactions
http://localhost:3000/account/transactions/test-payment-id
http://localhost:3000/account/manage

```
---

11. Create API files.

```bash
touch lib/api.ts
touch lib/square-api.ts
touch lib/square-types.ts
touch lib/format.ts
```

## Summary

```bash
lib/api.ts
→ Common Axios setup for backend API URL.

lib/square-api.ts
→ Square API request functions.

lib/square-types.ts
→ TypeScript types for Square data.

lib/format.ts
→ Reusable date, money, status, and ID formatting helpers.

```


- 11.a. lib/api.ts

```typescript
import axios from "axios"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8800"

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

```

- 11.b. lib/square-types.ts

```typescript
export type SquareOAuthUrlResponse = {
  auth_url: string
  state?: string
}

export type SquareConnection = {
  id: number
  merchant_id: string
  merchant_name?: string
  environment?: string
  is_active?: boolean
  connection_status?: "connected" | "disconnected" | "deleted" | string
  auto_sync_enabled?: boolean
  connected_at?: string
  disconnected_at?: string | null
  created_at?: string
  updated_at?: string

  // Optional fields for future sync feature
  last_synced_at?: string | null
  next_sync_at?: string | null
}

export type SquareMerchant = {
  id?: string
  merchant_id?: string
  merchant_name?: string
  business_name?: string
  name?: string
  country?: string
  language_code?: string
  currency?: string
  status?: string
  main_location_id?: string
}

export type SquareLocation = {
  id: string
  name?: string
  status?: string
  type?: string
  address?: {
    address_line_1?: string
    locality?: string
    administrative_district_level_1?: string
    postal_code?: string
    country?: string
  }
  timezone?: string
  currency?: string
}

export type SquareMoney = {
  amount?: number
  currency?: string
}

export type SquarePayment = {
  id: string
  order_id?: string
  status?: string
  source_type?: string
  location_id?: string
  receipt_number?: string
  receipt_url?: string
  created_at?: string
  updated_at?: string
  amount_money?: SquareMoney
  total_money?: SquareMoney
  approved_money?: SquareMoney
  raw_square_response?: unknown
}

export type SquareOrderLineItem = {
  uid?: string
  name?: string
  quantity?: string
  item_type?: string
  note?: string
  base_price_money?: SquareMoney
  total_money?: SquareMoney
  total_tax_money?: SquareMoney
}

export type SquareOrder = {
  id: string
  location_id?: string
  state?: string
  created_at?: string
  updated_at?: string
  closed_at?: string
  line_items?: SquareOrderLineItem[]
  total_money?: SquareMoney
  total_tax_money?: SquareMoney
  net_amount_due_money?: SquareMoney
  raw_square_response?: unknown
}

```



- 11.c. lib/square-api.ts

```typescript
import { api } from "@/lib/api"
import type {
  SquareConnection,
  SquareLocation,
  SquareMerchant,
  SquareOAuthUrlResponse,
  SquareOrder,
  SquarePayment,
} from "@/lib/square-types"

export async function getSquareOAuthUrl() {
  const response = await api.get<SquareOAuthUrlResponse>(
    "/api/square/oauth/url"
  )

  return response.data
}

export async function getSquareConnections() {
  const response = await api.get<SquareConnection[]>(
    "/api/square/connections"
  )

  return response.data
}

export async function getSquareMerchant(merchantId: string) {
  const response = await api.get<SquareMerchant>(
    `/api/square/merchant/${merchantId}`
  )

  return response.data
}

export async function getSquareLocations(merchantId: string) {
  const response = await api.get<SquareLocation[]>(
    `/api/square/locations/${merchantId}`
  )

  return response.data
}

export async function getSquarePayments(merchantId: string) {
  const response = await api.get<SquarePayment[]>(
    `/api/square/payments/${merchantId}`
  )

  return response.data
}

export async function getSquareOrder(merchantId: string, orderId: string) {
  const response = await api.get<SquareOrder>(
    `/api/square/orders/${merchantId}/${orderId}`
  )

  return response.data
}

export function formatSquareMoney(
  amount?: number,
  currency: string = "JPY"
) {
  if (amount == null) {
    return "-"
  }

  const value = amount / 100

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value)
}

export function formatDateTime(date?: string) {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date(date))
}

export function formatDateOnly(date?: string) {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(date))
}

```


- 11.d. lib/format.ts

```typescript
export function formatShortId(id?: string, length = 8) {
  if (!id) {
    return "-"
  }

  if (id.length <= length) {
    return id
  }

  return `${id.slice(0, length)}...`
}

export function formatStatus(status?: string) {
  if (!status) {
    return "-"
  }

  return status.replaceAll("_", " ").toLowerCase()
}

export function formatDateTime(date?: string | null) {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date(date))
}

```

```bash
npm run lint
```

- → checks TypeScript/React code style and possible errors
- → finds unused imports, wrong syntax, bad patterns
- → helps catch mistakes early before browser/runtime errors

---

12. Connect with Square
```bash
▶︎ Build /account/connect page
▶︎ Show Square branding
▶︎ Call backend OAuth URL endpoint
▶︎ Redirect user to Square OAuth page
```

- 12.a. Create Component file `components/square/`
```bash
touch components/square/connect-card.tsx
```

- inside `connect-card.tsx`

```tsx
"use client"

import { useState } from "react"
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getSquareOAuthUrl } from "@/lib/square-api"

export function ConnectCard() {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleConnectSquare() {
    try {
      setIsLoading(true)
      setErrorMessage(null)

      const data = await getSquareOAuthUrl()

      window.location.href = data.auth_url
    } catch (error) {
      console.error(error)
      setErrorMessage("Failed to get Square OAuth URL. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md rounded-2xl border shadow-sm">
      <CardHeader className="space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-black">
          <div className="h-8 w-8 rounded-md border-4 border-white" />
        </div>

        <div className="space-y-2">
          <CardTitle className="text-2xl font-semibold">
            Connect your Square account
          </CardTitle>
          <CardDescription className="text-sm leading-6">
            Connect Square POS with Samurai Tax to sync payments, orders, and
            transaction data.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Button
          className="h-11 w-full rounded-xl"
          disabled={isLoading}
          onClick={handleConnectSquare}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              Connect with Square
              <ExternalLink className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        {errorMessage ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Samurai Tax will request permission to read your Square merchant,
            payment, and order data.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
```

- 12.b Update Connect page
on `app/account/connect/page.tsx`

```tsx
import { ConnectCard } from "@/components/square/connect-card"

export default function ConnectPage() {
  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
        <ConnectCard />
      </div>
    </main>
  )
}
```

13. Transactions page header.

Build the top section of /account/transactions
Show Square logo, merchant name, connection status, last sync, next sync, refetch button, Help, and Manage button


- API used :
```bash
GET /api/square/connections
GET /api/square/merchant/{merchant_id}
```

on `lib/square-types.ts` update

```typescript
  // Optional fields for future sync feature
  last_synced_at?: string | null
  next_sync_at?: string | null
```

Note: We may not have last_synced_at and next_sync_at in backend yet, but frontend can safely support them now.


- 13.a Create Transactions header component

```touch
touch components/square/merchant-summary-card.tsx
```

on `components/merchant-summary-cards.tsx`

```tsx
"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Image from "next/image";
import { Card } from "../ui/card";
import squareLogo from "@/public/images/Square_Logo_2025_Black.png";
import { Button } from "../ui/button";
import { Loader2, RefreshCw, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SquareConnection, SquareMerchant } from "@/lib/square-types";
import { getSquareConnections, getSquareMerchant } from "@/lib/square-api";
import { Skeleton } from "../ui/skeleton";

// Helper function to format the sync label based on the provided date
function formatSyncLabel(date?: string | null, fallback = "-") {
  if (!date) return fallback;

  const targetTime = new Date(date).getTime();
  // Check if the date is valid or not
  if (Number.isNaN(targetTime)) return fallback;

  // Calculate the difference in milliseconds between the current time and the target time
  const diffMs = new Date().getTime() - targetTime;
  // Convert the difference from milliseconds to hours(absHousr = absolute hours)
  const absHours = Math.round(Math.abs(diffMs) / (1000 * 60 * 60));

  // If the difference is less than 1 hour, return the time in minutes
  if (absHours < 1) {
    return diffMs < 0
      ? `in ${Math.round(Math.abs(diffMs) / (1000 * 60))} 分`
      : `${Math.round(diffMs / (1000 * 60))} 分前`;
  }
  // Otherwise, return the time in hours
  return diffMs < 0 ? `in ${absHours} 時間` : `${absHours} 時間前`;
}

// A simple component to display synchronization information with a label and value
function SyncInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-24 text-left">
      <p className="text-sm font-medium leading-5 text-emerald-800/60">
        {label}
      </p>
      <p className="text-sm font-bold leading-5 text-emerald-950">{value}</p>
    </div>
  );
}

// A component to display error information in a styled card
function ErrorInfo({ message }: { message: string }) {
  return (
    <Card className="gap-0 overflow-hidden rounded-sm border bg-red-50 py-3 shadow-none">
      <p className="text-sm font-medium leading-5 text-red-800/60">{message}</p>
    </Card>
  );
}


// A loading card component that displays skeletons while the merchant data is being loaded
function LoadingCard() {
  return (
    <Card className="gap-0 overflow-hidden rounded-sm border bg-white py-0 shadow-none">
      <div className="flex items-center justify-between gap-4 px-5 py-2">
        <Skeleton className="h-7 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t px-5 py-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
    </Card>
  );
}

// ErrorCard : display user-friendly error messages to users. 
function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="gap-0 rounded-sm border bg-white px-5 py-3 shadow-none">
      <p className="text-sm font-medium text-red-600">{message}</p>
    </Card>
  );
}
export function MerchantSummaryCard() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [merchantName, setMerchantName] = useState<SquareMerchant | null>(null);
  const [connection, setConnection] = useState<SquareConnection | null>(null);

  const router = useRouter();

  // Function to load merchant data, which can be triggered manually or on component mount
  // with Callback help to prevent unnecessary re-renders and to maintain a stable reference to the function
  const loadMerchantData = useCallback(async (isManualSync = false) => {
    try {
      // If Manual Sync then show syncing state, otherwise show loading state
      if (isManualSync) {
        setIsSyncing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      // Fetch Square connections and merchant information in parallel
      const connections = await getSquareConnections();

      // Currenctly DB has no is_active column, so first row menas connected.
      // In the future, we should handle multiple connections and their active status properly.
      const activeConnection = connections[0];

      // If there's no active connection, redirect to the connect page
      if (!activeConnection) {
        router.replace("/account/connect");
        return;
      }
      setConnection(activeConnection);

      // Fetch merchant information using the active connection's merchant ID1
      try {
        const merchantData = await getSquareMerchant(
          activeConnection.merchant_id,
        );
        // Set the merchant name in the state
        setMerchantName(merchantData);
      } catch (error) {
        console.error("Error fetching merchant data:", error);

        // Merchant API failure should not redirect to connect page, because connection already has merchant info.
        setMerchantName(null);
        setErrorMessage("データの取得に失敗しました。もう一度同期してください。");
      }
    } catch (error) {
      console.error("データ取得エラー:", error);
      setErrorMessage("接続情報の取得に失敗しました。もう一度同期してください。");
      setConnection(null);
      setMerchantName(null);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [router]);


  // Load data on mount; stable ref via useCallback prevents unnecessary re-runs
  useEffect(() => {
    // Load merchant data when the component mounts
    loadMerchantData();
  }, [loadMerchantData]);


  // Compute the display name for the merchant using useMemo to optimize performance
  const merchantDisplayName = useMemo(() => {
    if(!connection) return "-";

    return (
      merchantName?.merchant_name ??
      merchantName?.business_name ??
      merchantName?.name ??
      connection.merchant_name ??
      merchantName?.merchant_id ??
      merchantName?.id ??
      connection.merchant_id
    );
  }, [merchantName, connection]);


  const lastSyncLabel = formatSyncLabel(
    connection?.last_synced_at ?? 
    connection?.updated_at ??
    connection?.created_at
  )

  const nextSyncLabel = formatSyncLabel(
    connection?.next_sync_at,
    "-"
  )

  // if the data is still loading, show the loading card with skeletons
  // instead of Loading... for better UX 
  if (isLoading) {
    return <LoadingCard />;
  }


  // If there's no connection and an error message exists, show the error card with the message
  if (!connection && errorMessage) {
    return <ErrorCard message={errorMessage} />;
  }

  // If there's no connection, show the loading card (this case is hit when there's no active connection and we're waiting for the redirect to the connect page)
  if (!connection) {
    return (<LoadingCard />);
  }

  return (
    <Card className="gap-0 overflow-hidden rounded-sm border bg-white py-0 shadow-none">
      <div className="flex items-center justify-between gap-4 px-5 py-2">
        <Image
          src={squareLogo}
          alt="Square Logo"
          className="h-7 w-auto object-contain"
          priority
        />
        <div className="flex items-center gap-4">
          <SyncInfo
            label="Last Sync"
            value= {lastSyncLabel}
          />
          <SyncInfo
            label="Next Sync"
            value={nextSyncLabel}
          />
          <Button
            type="button"
            size="icon"
            aria-label="Sync Now"
            onClick={() => loadMerchantData(true)}
            className="h-8 w-8 rounded  text-white hover:bg-emerald-600"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t px-5 py-3">
        <p className="truncate text-sm font-medium text-slate-700">
          {merchantDisplayName}
        </p>
        <Link
          href="/account/manage"
          className="group flex items-center text-sm font-medium text-slate-700"
        >
          Manage
          <Settings className="ml-1 h-4 w-4 group-hover:animate-spin" />
        </Link>
      </div>
      {errorMessage && (
        <div className="px-5 py-3">
          <ErrorInfo message={errorMessage} />
        </div>
      )}
    </Card>
  );
}

```

14. Transactions Table.

Create new file on `components/square/transaction-table.tsx`


```tsx
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Eye, Loader2, ReceiptText, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getSquareConnections,
  getSquareLocations,
  getSquarePayments,
} from "@/lib/square-api"
import type {
  SquareConnection,
  SquareLocation,
  SquarePayment,
} from "@/lib/square-types"
import {
  formatDateTime,
  formatShortId,
  formatSquareMoney,
  formatStatus,
} from "@/lib/format"

type TransactionTableProps = {
  selectedPayments: SquarePayment[]
  onSelectedPaymentsChange: (payments: SquarePayment[]) => void
  onLocationChange?: (location: SquareLocation | null) => void
}

function getPaymentKey(payment: SquarePayment) {
  return String(payment.payment_id ?? payment.id)
}

function getPaymentDate(payment: SquarePayment) {
  return payment.created_at_square ?? payment.created_at
}

export function TransactionTable({
  selectedPayments,
  onSelectedPaymentsChange,
  onLocationChange,
}: TransactionTableProps) {
  const [connection, setConnection] = useState<SquareConnection | null>(null)
  const [selectedLocation, setSelectedLocation] =
    useState<SquareLocation | null>(null)
  const [payments, setPayments] = useState<SquarePayment[]>([])
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefetching, setIsRefetching] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const selectedPaymentKeySet = useMemo(() => {
    return new Set(selectedPayments.map((payment) => getPaymentKey(payment)))
  }, [selectedPayments])

  const selectedPaymentsFromCurrentList = useMemo(() => {
    return payments.filter((payment) =>
      selectedPaymentKeySet.has(getPaymentKey(payment))
    )
  }, [payments, selectedPaymentKeySet])

  const visiblePayments =
    showSelectedOnly && selectedPaymentsFromCurrentList.length > 0
      ? selectedPaymentsFromCurrentList
      : payments

  const visiblePaymentKeys = visiblePayments.map((payment) =>
    getPaymentKey(payment)
  )

  const isAllVisibleSelected =
    visiblePayments.length > 0 &&
    visiblePaymentKeys.every((key) => selectedPaymentKeySet.has(key))

  const isPartiallyVisibleSelected =
    visiblePaymentKeys.some((key) => selectedPaymentKeySet.has(key)) &&
    !isAllVisibleSelected

  const loadPayments = useCallback(
    async (isManualRefetch = false) => {
      try {
        if (isManualRefetch) {
          setIsRefetching(true)
        } else {
          setIsLoading(true)
        }

        setErrorMessage(null)

        const connections = await getSquareConnections()

        const activeConnection =
          connections.find((item) => item.is_active !== false) ??
          connections[0]

        if (!activeConnection) {
          setConnection(null)
          setSelectedLocation(null)
          setPayments([])
          setShowSelectedOnly(false)
          onSelectedPaymentsChange([])
          onLocationChange?.(null)
          return
        }

        setConnection(activeConnection)

        const locations = await getSquareLocations(activeConnection.merchant_id)
        const firstLocation = locations[0]
        const squareLocationId = firstLocation?.location_id

        if (!squareLocationId) {
          setSelectedLocation(null)
          setPayments([])
          setShowSelectedOnly(false)
          onSelectedPaymentsChange([])
          onLocationChange?.(null)
          setErrorMessage("No Square location_id found for this merchant.")
          return
        }

        setSelectedLocation(firstLocation)
        onLocationChange?.(firstLocation)

        const paymentData = await getSquarePayments(
          activeConnection.merchant_id,
          squareLocationId
        )

        setPayments(paymentData)
        setShowSelectedOnly(false)
        onSelectedPaymentsChange([])
      } catch (error) {
        console.error(error)
        setErrorMessage("Failed to load Square transactions.")
      } finally {
        setIsLoading(false)
        setIsRefetching(false)
      }
    },
    [onLocationChange, onSelectedPaymentsChange]
  )

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  useEffect(() => {
    if (selectedPayments.length === 0) {
      setShowSelectedOnly(false)
    }
  }, [selectedPayments.length])

  function togglePaymentSelection(payment: SquarePayment) {
    const paymentKey = getPaymentKey(payment)

    if (selectedPaymentKeySet.has(paymentKey)) {
      onSelectedPaymentsChange(
        selectedPayments.filter(
          (selectedPayment) => getPaymentKey(selectedPayment) !== paymentKey
        )
      )
      return
    }

    onSelectedPaymentsChange([...selectedPayments, payment])
  }

  function toggleVisiblePaymentsSelection(checked: boolean) {
    if (checked) {
      const nextSelectedMap = new Map<string, SquarePayment>()

      selectedPayments.forEach((payment) => {
        nextSelectedMap.set(getPaymentKey(payment), payment)
      })

      visiblePayments.forEach((payment) => {
        nextSelectedMap.set(getPaymentKey(payment), payment)
      })

      onSelectedPaymentsChange(Array.from(nextSelectedMap.values()))
      return
    }

    const visibleKeySet = new Set(visiblePaymentKeys)

    onSelectedPaymentsChange(
      selectedPayments.filter(
        (payment) => !visibleKeySet.has(getPaymentKey(payment))
      )
    )
  }

  function handleContinueSelected() {
    console.log("Selected Square payments:", selectedPayments)
    setShowSelectedOnly(true)
  }

  if (isLoading) {
    return (
      <Card className="rounded-2xl border shadow-sm">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>

        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!connection) {
    return (
      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold">No transactions available</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect your Square account first to load payment data.
            </p>
          </div>

          <Button asChild className="rounded-xl">
            <Link href="/account/connect">Connect with Square</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ReceiptText className="h-5 w-5" />
            Transactions
          </CardTitle>

          <CardDescription>
            {payments.length} Square payment
            {payments.length === 1 ? "" : "s"} found
            {selectedLocation?.name ? ` from ${selectedLocation.name}` : ""}.
            {selectedPayments.length > 0
              ? ` ${selectedPayments.length} selected.`
              : ""}
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedPayments.length > 0 ? (
            <Button
              variant="outline"
              className="w-fit rounded-xl"
              onClick={() => setShowSelectedOnly((current) => !current)}
            >
              {showSelectedOnly ? "Show all" : "Show selected only"}
            </Button>
          ) : null}

          <Button
            variant="outline"
            className="w-fit rounded-xl"
            disabled={selectedPayments.length === 0}
            onClick={handleContinueSelected}
          >
            Continue Selected ({selectedPayments.length})
          </Button>

          <Button
            variant="outline"
            className="w-fit rounded-xl"
            disabled={isRefetching}
            onClick={() => loadPayments(true)}
          >
            {isRefetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refetch
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {errorMessage ? (
          <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        {payments.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm font-medium">No Square payments found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try refetching after creating sandbox payment data.
            </p>
          </div>
        ) : (
          <div
            className={
              selectedPayments.length > 0 && !showSelectedOnly
                ? "max-h-72 overflow-auto rounded-xl border"
                : "overflow-hidden rounded-xl border"
            }
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-13">
                    <Checkbox
                      checked={
                        isAllVisibleSelected
                          ? true
                          : isPartiallyVisibleSelected
                            ? "indeterminate"
                            : false
                      }
                      aria-label="Select visible transactions"
                      onCheckedChange={(checked) =>
                        toggleVisiblePaymentsSelection(checked === true)
                      }
                    />
                  </TableHead>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-25 text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {visiblePayments.map((payment) => {
                  const paymentKey = getPaymentKey(payment)
                  const paymentDate = getPaymentDate(payment)
                  const isSelected = selectedPaymentKeySet.has(paymentKey)

                  return (
                    <TableRow
                      key={paymentKey}
                      className={
                        isSelected
                          ? "cursor-pointer bg-muted/70 hover:bg-muted/80"
                          : "cursor-pointer"
                      }
                      onClick={() => togglePaymentSelection(payment)}
                    >
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          aria-label={`Select transaction ${paymentKey}`}
                          onCheckedChange={() => togglePaymentSelection(payment)}
                        />
                      </TableCell>

                      <TableCell>
                        <div className="font-medium">
                          {formatShortId(payment.payment_id, 14)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Local ID: {formatShortId(payment.id, 12)}
                        </div>
                      </TableCell>

                      <TableCell className="text-sm">
                        {formatShortId(payment.order_id, 14)}
                      </TableCell>

                      <TableCell className="text-sm">
                        {formatDateTime(paymentDate)}
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary" className="rounded-full">
                          {formatStatus(payment.status)}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-sm">
                        {payment.source_type ?? "-"}
                      </TableCell>

                      <TableCell className="text-sm">
                        {selectedLocation?.name ??
                          payment.location_id ??
                          selectedLocation?.location_id ??
                          "-"}
                      </TableCell>

                      <TableCell className="text-right font-medium">
                        {formatSquareMoney(
                          payment.amount,
                          payment.currency ?? "JPY"
                        )}
                      </TableCell>

                      <TableCell
                        className="text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                        >
                          <Link
                            href={`/account/transactions/${
                              payment.payment_id ?? payment.id
                            }`}
                          >
                            View
                            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

```

