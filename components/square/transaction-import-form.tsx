"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarIcon, CirclePlus, ReceiptText, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SquareLocation, SquarePayment } from "@/lib/square-types"
import { formatShortId } from "@/lib/format"

type TransactionImportFormProps = {
  selectedPayments: SquarePayment[]
  selectedLocation: SquareLocation | null
}

type PurchaseItem = {
  id: string
  paymentId: string
  orderId: string
  itemType: "general" | "consumable"
  productName: string
  quantity: string
  taxExcludedAmount: string
  taxIncludedAmount: string
  taxRate: "10" | "8"
  currency: string
}

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
])

function getPaymentKey(payment: SquarePayment) {
  return String(payment.payment_id ?? payment.id)
}

function getPaymentDate(payment: SquarePayment | null) {
  return payment?.created_at_square ?? payment?.created_at ?? null
}

function toDateInputValue(date?: string | null) {
  if (!date) {
    return ""
  }

  return new Date(date).toISOString().slice(0, 10)
}

function toMajorAmount(amount?: number | string | null, currency = "JPY") {
  if (amount == null || amount === "") {
    return ""
  }

  const numericAmount = Number(amount)

  if (Number.isNaN(numericAmount)) {
    return ""
  }

  const upperCurrency = currency.toUpperCase()
  const divisor = ZERO_DECIMAL_CURRENCIES.has(upperCurrency) ? 1 : 100

  return String(numericAmount / divisor)
}

function toNumber(value: string) {
  const numericValue = Number(value)

  if (Number.isNaN(numericValue)) {
    return 0
  }

  return numericValue
}

function formatMajorCurrency(amount: number, currency = "JPY") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount)
}

function buildPurchaseItem(payment: SquarePayment, index: number): PurchaseItem {
  const currency = payment.currency ?? "JPY"
  const taxIncludedAmount = toMajorAmount(payment.amount, currency)
  const numericIncludedAmount = Number(taxIncludedAmount)
  const taxExcludedAmount =
    !Number.isNaN(numericIncludedAmount) && numericIncludedAmount > 0
      ? String(Math.round(numericIncludedAmount / 1.1))
      : ""

  return {
    id: getPaymentKey(payment),
    paymentId: payment.payment_id ?? "",
    orderId: payment.order_id ?? "",
    itemType: "general",
    productName: `Square Transaction ${index + 1}`,
    quantity: "1",
    taxExcludedAmount,
    taxIncludedAmount,
    taxRate: "10",
    currency,
  }
}

export function TransactionImportForm({
  selectedPayments,
  selectedLocation,
}: TransactionImportFormProps) {
  const [storeName, setStoreName] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [orderOrReceiptNo, setOrderOrReceiptNo] = useState("")
  const [items, setItems] = useState<PurchaseItem[]>([])

  const firstPayment = selectedPayments[0] ?? null
  const displayCurrency = firstPayment?.currency ?? "JPY"

  useEffect(() => {
    if (selectedPayments.length === 0) {
      setStoreName("")
      setPurchaseDate("")
      setOrderOrReceiptNo("")
      setItems([])
      return
    }

    setStoreName(selectedLocation?.name ?? firstPayment?.location_id ?? "")
    setPurchaseDate(toDateInputValue(getPaymentDate(firstPayment)))
    setOrderOrReceiptNo(
      selectedPayments
        .map((payment) => payment.order_id ?? payment.payment_id ?? "")
        .filter(Boolean)
        .join(", ")
    )
    setItems(selectedPayments.map(buildPurchaseItem))
  }, [firstPayment, selectedLocation, selectedPayments])

  const summary = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const excluded = toNumber(item.taxExcludedAmount)
        const included = toNumber(item.taxIncludedAmount)
        const tax = Math.max(included - excluded, 0)

        if (item.itemType === "general") {
          acc.generalTotal += excluded
        } else {
          acc.consumableTotal += excluded
        }

        acc.taxExcludedTotal += excluded
        acc.tax += tax
        acc.paymentTotal += included

        return acc
      },
      {
        generalTotal: 0,
        consumableTotal: 0,
        taxExcludedTotal: 0,
        tax: 0,
        paymentTotal: 0,
      }
    )
  }, [items])

  function updateItem(
    itemId: string,
    field: keyof PurchaseItem,
    value: string
  ) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    )
  }

  function addManualItem() {
    setItems((currentItems) => [
      ...currentItems,
      {
        id: `manual-${Date.now()}`,
        paymentId: "",
        orderId: "",
        itemType: "general",
        productName: "",
        quantity: "1",
        taxExcludedAmount: "",
        taxIncludedAmount: "",
        taxRate: "10",
        currency: displayCurrency,
      },
    ])
  }

  function removeItem(itemId: string) {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== itemId)
    )
  }

  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ReceiptText className="h-5 w-5" />
          購入情報
        </CardTitle>
        <CardDescription>
          Select Square transactions above. Selected payment data will be
          imported into this form automatically.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {selectedPayments.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
            <p className="text-sm font-medium">取引を選択してください</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Select one or more Square transactions from the table to auto-fill
              purchase information.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-semibold">
                Selected Transactions: {selectedPayments.length}
              </p>

              <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                {selectedPayments.map((payment) => (
                  <div
                    key={getPaymentKey(payment)}
                    className="rounded-lg border bg-background p-3"
                  >
                    <p className="font-medium">
                      Payment ID: {formatShortId(payment.payment_id, 16)}
                    </p>
                    <p className="text-muted-foreground">
                      Order ID: {formatShortId(payment.order_id, 16)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>店舗名</Label>
                <Input
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                  placeholder="店舗名"
                />
              </div>

              <div className="space-y-2">
                <Label>購入日</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={purchaseDate}
                    onChange={(event) => setPurchaseDate(event.target.value)}
                  />
                  <CalendarIcon className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>注文IDまたはレシートNo *</Label>
                <Input
                  value={orderOrReceiptNo}
                  onChange={(event) =>
                    setOrderOrReceiptNo(event.target.value)
                  }
                  placeholder="注文IDまたはレシートNo"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold">商品内訳</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Each selected Square transaction is imported as a purchase
                  line item.
                </p>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border bg-muted/30 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">
                        通番：{index + 1}
                      </p>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label>物品区分</Label>
                        <Select
                          value={item.itemType}
                          onValueChange={(value) =>
                            updateItem(
                              item.id,
                              "itemType",
                              value as PurchaseItem["itemType"]
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="物品区分" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">一般物品</SelectItem>
                            <SelectItem value="consumable">消耗品</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>商品名称</Label>
                        <Input
                          value={item.productName}
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              "productName",
                              event.target.value
                            )
                          }
                          placeholder="商品名称"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Payment ID</Label>
                        <Input value={item.paymentId} readOnly />
                      </div>

                      <div className="space-y-2">
                        <Label>Order ID</Label>
                        <Input value={item.orderId} readOnly />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>数量</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.id, "quantity", event.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>税抜価格</Label>
                        <Input
                          type="number"
                          value={item.taxExcludedAmount}
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              "taxExcludedAmount",
                              event.target.value
                            )
                          }
                          placeholder="税抜価格"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>税込価格</Label>
                        <Input
                          type="number"
                          value={item.taxIncludedAmount}
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              "taxIncludedAmount",
                              event.target.value
                            )
                          }
                          placeholder="税込価格"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>軽減税率対象区分</Label>
                        <Select
                          value={item.taxRate}
                          onValueChange={(value) =>
                            updateItem(
                              item.id,
                              "taxRate",
                              value as PurchaseItem["taxRate"]
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="税率" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10%</SelectItem>
                            <SelectItem value="8">8%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={addManualItem}
                >
                  <CirclePlus className="h-6 w-6" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">一般物品合計:</span>
                  <span>
                    {formatMajorCurrency(
                      summary.generalTotal,
                      displayCurrency
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="font-medium">消耗品合計:</span>
                  <span>
                    {formatMajorCurrency(
                      summary.consumableTotal,
                      displayCurrency
                    )}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">合計金額（税抜）:</span>
                  <span>
                    {formatMajorCurrency(
                      summary.taxExcludedTotal,
                      displayCurrency
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="font-medium">消費税:</span>
                  <span>{formatMajorCurrency(summary.tax, displayCurrency)}</span>
                </div>

                <div className="flex justify-between text-base font-semibold">
                  <span>支払合計:</span>
                  <span>
                    {formatMajorCurrency(summary.paymentTotal, displayCurrency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button className="h-12 w-full max-w-xs rounded-xl">
                次へ
              </Button>
            </div>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
              >
                申請をキャンセルする
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}