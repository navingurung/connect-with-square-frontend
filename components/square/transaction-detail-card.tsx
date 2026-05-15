"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Braces,
  Building2,
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  ReceiptText,
  RotateCcw,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getSquareConnections,
  getSquareLocations,
  getSquareOrder,
  getSquarePayments,
} from "@/lib/square-api";
import type {
  SquareLocation,
  SquareOrder,
  SquareOrderLineItem,
  SquarePayment,
} from "@/lib/square-types";
import {
  formatDateTime,
  formatShortId,
  formatSquareMoney,
  formatStatus,
} from "@/lib/format";

type TransactionDetailCardProps = {
  paymentId: string;
  locationId?: string;
};

type FindPaymentResult = {
  payment: SquarePayment;
  location: SquareLocation;
};

function getPaymentKey(payment: SquarePayment) {
  return String(payment.payment_id ?? payment.id);
}

function getPaymentDate(payment: SquarePayment | null) {
  return payment?.created_at_square ?? payment?.created_at ?? null;
}

function getLocationId(location: SquareLocation) {
  return location.location_id ?? String(location.id ?? "");
}

function getLocationName(location: SquareLocation | null) {
  if (!location) return "-";

  return (
    location.name ??
    location.business_name ??
    location.location_id ??
    String(location.id ?? "-")
  );
}

function isTargetPayment(payment: SquarePayment, targetPaymentId: string) {
  const decodedTargetPaymentId = decodeURIComponent(targetPaymentId);

  return (
    getPaymentKey(payment) === decodedTargetPaymentId ||
    String(payment.id) === decodedTargetPaymentId ||
    payment.payment_id === decodedTargetPaymentId
  );
}

function getOrderLineItems(order: SquareOrder | null): SquareOrderLineItem[] {
  if (!order) return [];

  if (Array.isArray(order.line_items)) {
    return order.line_items;
  }

  const rawOrder = order as SquareOrder & {
    order?: {
      line_items?: SquareOrderLineItem[];
    };
    raw?: {
      order?: {
        line_items?: SquareOrderLineItem[];
      };
      line_items?: SquareOrderLineItem[];
    };
  };

  if (Array.isArray(rawOrder.order?.line_items)) {
    return rawOrder.order.line_items;
  }

  if (Array.isArray(rawOrder.raw?.order?.line_items)) {
    return rawOrder.raw.order.line_items;
  }

  if (Array.isArray(rawOrder.raw?.line_items)) {
    return rawOrder.raw.line_items;
  }

  return [];
}

async function findPaymentAcrossLocations({
  merchantId,
  locations,
  paymentId,
}: {
  merchantId: string;
  locations: SquareLocation[];
  paymentId: string;
}): Promise<FindPaymentResult | null> {
  for (const location of locations) {
    const squareLocationId = getLocationId(location);

    if (!squareLocationId) continue;

    try {
      const payments = await getSquarePayments(merchantId, squareLocationId);

      const matchedPayment =
        payments.find((payment) => isTargetPayment(payment, paymentId)) ?? null;

      if (matchedPayment) {
        return {
          payment: matchedPayment,
          location,
        };
      }
    } catch (error) {
      console.error(
        `Failed to load payments for location ${squareLocationId}:`,
        error,
      );
    }
  }

  return null;
}

function renderJsonWithHighlight(jsonText: string) {
  const tokenRegex =
    /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;

  const parts: ReactNode[] = [];
  let lastIndex = 0;

  jsonText.replace(tokenRegex, (match, _stringPart, isKey, offset) => {
    if (offset > lastIndex) {
      parts.push(jsonText.slice(lastIndex, offset));
    }

    let className = "text-slate-100";

    if (isKey) {
      className = "text-emerald-300";
    } else if (match.startsWith('"')) {
      className = "text-lime-300";
    } else if (match === "true" || match === "false") {
      className = "text-sky-300";
    } else if (match === "null") {
      className = "text-rose-300";
    } else {
      className = "text-amber-300";
    }

    parts.push(
      <span key={`${match}-${offset}`} className={className}>
        {match}
      </span>,
    );

    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < jsonText.length) {
    parts.push(jsonText.slice(lastIndex));
  }

  return parts;
}

export function TransactionDetailCard({
  paymentId,
  locationId,
}: TransactionDetailCardProps) {
  const [payment, setPayment] = useState<SquarePayment | null>(null);
  const [order, setOrder] = useState<SquareOrder | null>(null);
  const [location, setLocation] = useState<SquareLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [isJsonCopied, setIsJsonCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTransactionDetail = useCallback(
    async (isRetry = false) => {
      try {
        if (isRetry) {
          setIsRetrying(true);
        } else {
          setIsLoading(true);
          setPayment(null);
          setOrder(null);
          setLocation(null);
        }

        setErrorMessage(null);

        const connections = await getSquareConnections();

        // ✅ only use a connection that is actually connected
        // prevents 401 errors from disconnected/deleted connections
        const activeConnection =
          connections.find((item) => item.connection_status === "connected") ??
          null;

        if (!activeConnection) {
          setErrorMessage("No active Square connection found.");
          return;
        }

        const locationData = await getSquareLocations(
          activeConnection.merchant_id,
        );

        const validLocations = locationData.filter((item) =>
          getLocationId(item),
        );

        if (validLocations.length === 0) {
          setErrorMessage("No Square location found for this merchant.");
          return;
        }

        const decodedLocationId = locationId
          ? decodeURIComponent(locationId)
          : null;

        const preferredLocations = decodedLocationId
          ? validLocations.filter(
              (item) => getLocationId(item) === decodedLocationId,
            )
          : [];

        const fallbackLocations = decodedLocationId
          ? validLocations.filter(
              (item) => getLocationId(item) !== decodedLocationId,
            )
          : validLocations;

        const locationsToSearch =
          preferredLocations.length > 0
            ? [...preferredLocations, ...fallbackLocations]
            : validLocations;

        const result = await findPaymentAcrossLocations({
          merchantId: activeConnection.merchant_id,
          locations: locationsToSearch,
          paymentId,
        });

        if (!result) {
          setErrorMessage("Transaction was not found.");
          return;
        }

        let nextOrder: SquareOrder | null = null;

        if (result.payment.order_id) {
          nextOrder = await getSquareOrder(
            activeConnection.merchant_id,
            result.payment.order_id,
          );
        }

        setPayment(result.payment);
        setLocation(result.location);
        setOrder(nextOrder);
      } catch (error) {
        console.error(error);
        setErrorMessage("Failed to load transaction detail.");
      } finally {
        setIsLoading(false);
        setIsRetrying(false);
      }
    },
    [paymentId, locationId],
  );

  useEffect(() => {
    loadTransactionDetail();
  }, [loadTransactionDetail]);

  useEffect(() => {
    if (!isJsonCopied) return;

    const timer = window.setTimeout(() => {
      setIsJsonCopied(false);
    }, 1800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isJsonCopied]);

  const lineItems = useMemo(() => getOrderLineItems(order), [order]);

  const jsonPayload = useMemo(
    () => ({
      payment,
      order,
      location,
    }),
    [payment, order, location],
  );

  const jsonText = useMemo(() => {
    return JSON.stringify(jsonPayload, null, 2);
  }, [jsonPayload]);

  const highlightedJson = useMemo(() => {
    return renderJsonWithHighlight(jsonText);
  }, [jsonText]);

  const handleCopyJson = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(jsonText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = jsonText;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setIsJsonCopied(true);
    } catch (error) {
      console.error("Failed to copy JSON:", error);
      setErrorMessage("JSONのコピーに失敗しました。");
    }
  }, [jsonText]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />

        <Card className="rounded-2xl border shadow-sm">
          <CardHeader>
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>

          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="space-y-6">
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/account/transactions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Transactions
          </Link>
        </Button>

        <Card className="rounded-2xl border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <X className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                Transaction detail unavailable
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {errorMessage ?? "Transaction detail was not found."}
              </p>
            </div>

            <Button
              variant="outline"
              className="rounded-xl"
              disabled={isRetrying}
              onClick={() => loadTransactionDetail(true)}
            >
              {isRetrying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const paymentDate = getPaymentDate(payment);

  const paymentAmount = formatSquareMoney(
    payment.amount,
    payment.currency ?? "JPY",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <Button asChild variant="outline" className="w-fit rounded-xl">
          <Link href="/account/transactions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Transactions
          </Link>
        </Button>

        <div className="flex flex-wrap gap-2">
          {payment.receipt_url ? (
            <Button asChild variant="outline" className="rounded-xl">
              <a href={payment.receipt_url} target="_blank" rel="noreferrer">
                View Document
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          ) : null}

          <Button
            variant={showJson ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setShowJson((current) => !current)}
          >
            <Braces className="mr-2 h-4 w-4" />
            {showJson ? "Detail View" : "JSON Version"}
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      {showJson ? (
        <Card className="overflow-hidden rounded-2xl border shadow-sm">
          <div className="border-b bg-background px-6 py-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <div className="flex items-center gap-2">
                  <Braces className="h-5 w-5" />
                  <h1 className="text-2xl font-semibold">JSON Version</h1>
                </div>

                <p className="mt-2 max-w-3xl break-all text-sm text-muted-foreground">
                  Payment ID: {payment.payment_id ?? payment.id}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit rounded-xl"
                onClick={handleCopyJson}
              >
                {isJsonCopied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {isJsonCopied ? "Copied" : "Copy JSON"}
              </Button>
            </div>
          </div>

          <CardContent className="p-6">
            <pre className="max-h-160 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-50">
              <code>{highlightedJson}</code>
            </pre>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-2xl border shadow-sm">
          <div className="border-b bg-background px-6 py-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-5 w-5" />
                  <h1 className="text-2xl font-semibold">Transaction Detail</h1>
                </div>

                <p className="mt-2 max-w-3xl break-all text-sm text-muted-foreground">
                  Payment ID: {payment.payment_id ?? payment.id}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full">
                  {formatStatus(payment.status)}
                </Badge>

                <Badge variant="outline" className="rounded-full">
                  {payment.source_type ?? "Payment"}
                </Badge>
              </div>
            </div>
          </div>

          <CardContent className="space-y-8 p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon={<CreditCard className="h-4 w-4" />}
                label="Amount"
                value={paymentAmount}
              />

              <SummaryCard
                icon={<CalendarDays className="h-4 w-4" />}
                label="Date"
                value={formatDateTime(paymentDate)}
              />

              <SummaryCard
                icon={<FileText className="h-4 w-4" />}
                label="Order ID"
                value={formatShortId(payment.order_id, 18)}
              />

              <SummaryCard
                icon={<MapPin className="h-4 w-4" />}
                label="Location"
                value={getLocationName(location)}
              />
            </div>

            <section className="space-y-3">
              <SectionTitle title="Basic Information" />

              <div className="grid gap-4 rounded-2xl border bg-muted/20 p-5 md:grid-cols-2">
                <InfoItem label="Type" value="Sales Receipt" />
                <InfoItem label="Status" value={formatStatus(payment.status)} />
                <InfoItem
                  label="Payment ID"
                  value={payment.payment_id ?? payment.id}
                />
                <InfoItem label="Order ID" value={payment.order_id ?? "-"} />
                <InfoItem
                  label="Source Type"
                  value={payment.source_type ?? "-"}
                />
                <InfoItem label="Currency" value={payment.currency ?? "-"} />
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <SectionTitle title="Attributes" />

              <div className="grid gap-4 rounded-2xl border bg-muted/20 p-5 md:grid-cols-2">
                <InfoItem
                  label="merchant_id"
                  value={payment.merchant_id ?? "-"}
                />
                <InfoItem
                  label="location_id"
                  value={payment.location_id ?? location?.location_id ?? "-"}
                />
                <InfoItem
                  label="location_name"
                  value={getLocationName(location)}
                />
                <InfoItem
                  label="business_name"
                  value={location?.business_name ?? "-"}
                />
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <SectionTitle title="Payment" />

              <div className="rounded-2xl border bg-muted/20 p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <p className="text-sm font-medium">
                      {payment.source_type ?? "Payment"} charged {paymentAmount}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Processed at {formatDateTime(paymentDate)}
                    </p>
                  </div>

                  <Badge variant="secondary" className="w-fit rounded-full">
                    {formatStatus(payment.status)}
                  </Badge>
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <SectionTitle title="Line Items" />

              {lineItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
                  <p className="text-sm font-medium">No line items found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Square order data did not return line item details for this
                    transaction.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">
                          Item
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Tax Code
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Total
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {lineItems.map((item, index) => (
                        <tr key={item.uid ?? index} className="border-t">
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {index + 1}. {item.name ?? "Custom Amount"}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-muted-foreground">
                            None
                          </td>

                          <td className="px-4 py-3 text-right">
                            {item.quantity ?? "1"}
                          </td>

                          <td className="px-4 py-3 text-right">
                            {formatSquareMoney(
                              item.base_price_money?.amount,
                              item.base_price_money?.currency ??
                                payment.currency ??
                                "JPY",
                            )}
                          </td>

                          <td className="px-4 py-3 text-right font-medium">
                            {formatSquareMoney(
                              item.total_money?.amount,
                              item.total_money?.currency ??
                                payment.currency ??
                                "JPY",
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <Separator />

            <section className="space-y-3">
              <SectionTitle title="Totals" />

              <div className="ml-auto max-w-md space-y-3 rounded-2xl border bg-muted/20 p-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sub Total</span>
                  <span className="font-medium">{paymentAmount}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">-</span>
                </div>

                <Separator />

                <div className="flex justify-between text-base font-semibold">
                  <span>Grand Total</span>
                  <span>{paymentAmount}</span>
                </div>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/account/transactions">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>

              <Button asChild className="rounded-xl">
                <Link href="/account/transactions">Close</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-xs font-medium uppercase">{label}</p>
      </div>

      <p className="mt-2 break-all text-sm font-semibold">{value ?? "-"}</p>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-medium">{value ?? "-"}</p>
    </div>
  );
}
