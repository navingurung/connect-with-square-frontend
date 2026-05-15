"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  ReceiptText,
  Search,
  ChevronsDown,
  ChevronsUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getSquareConnections,
  getSquareLocations,
  getSquarePayments,
} from "@/lib/square-api";
import type {
  SquareConnection,
  SquareLocation,
  SquarePayment,
} from "@/lib/square-types";
import { formatSquareMoney, formatStatus } from "@/lib/format";

type TransactionTableProps = {
  selectedPayments: SquarePayment[];
  onSelectedPaymentsChange: (payments: SquarePayment[]) => void;
  onLocationChange?: (location: SquareLocation | null) => void;
  refreshKey?: number;
  locationId?: string;
};

type PaymentWithExtraFields = SquarePayment & {
  item_name?: string | null;
  quantity?: string | number | null;
  tax_amount?: number | string | null;
  total_tax?: number | string | null;
  taxes_and_fees?: number | string | null;
  total_tax_money?: {
    amount?: number | string | null;
    currency?: string | null;
  } | null;
};

const PAGE_SIZE = 10;
const COLLAPSED_CARD_COUNT = 2;

function getPaymentKey(payment: SquarePayment) {
  return String(payment.payment_id ?? payment.id);
}

function getPaymentDate(payment: SquarePayment) {
  return payment.created_at_square ?? payment.created_at;
}

function getPaymentSearchText(payment: SquarePayment) {
  return [
    payment.id,
    payment.payment_id,
    payment.order_id,
    payment.status,
    payment.source_type,
    payment.location_id,
    payment.amount,
    payment.currency,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getSquareLocationId(location: SquareLocation) {
  return location.location_id ?? String(location.id ?? "");
}

function getLocationLabel(location: SquareLocation) {
  return (
    location.name ??
    location.business_name ??
    location.location_id ??
    String(location.id ?? "-")
  );
}

function toLocalDateInputValue(date?: string | null) {
  if (!date) return "";
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "";
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameLocalDate(
  paymentDate: string | null | undefined,
  dateFilter: string,
) {
  if (!dateFilter) return true;
  if (!paymentDate) return false;
  return toLocalDateInputValue(paymentDate) === dateFilter;
}

function formatTransactionDateTime(date?: string | null) {
  if (!date) return "-";
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

function getItemName(payment: SquarePayment) {
  const p = payment as PaymentWithExtraFields;
  return p.item_name ?? "Custom Amount";
}

function getQuantity(payment: SquarePayment) {
  const p = payment as PaymentWithExtraFields;
  return String(p.quantity ?? "1");
}

function getTaxesAndFees(payment: SquarePayment) {
  const p = payment as PaymentWithExtraFields;
  const currency = payment.currency ?? "JPY";
  if (p.total_tax_money?.amount != null) {
    return formatSquareMoney(
      p.total_tax_money.amount,
      p.total_tax_money.currency ?? currency,
    );
  }
  const taxAmount = p.tax_amount ?? p.total_tax ?? p.taxes_and_fees;
  if (taxAmount == null || taxAmount === "") return "-";
  return formatSquareMoney(taxAmount, currency);
}

function buildDetailHref(payment: SquarePayment, selectedLocationId: string) {
  const detailPaymentId = encodeURIComponent(
    String(payment.payment_id ?? payment.id),
  );
  const detailLocationId = payment.location_id ?? selectedLocationId;
  if (!detailLocationId) {
    return `/account/transactions/${detailPaymentId}`;
  }
  return `/account/transactions/${detailPaymentId}?locationId=${encodeURIComponent(
    String(detailLocationId),
  )}`;
}

export function TransactionTable({
  selectedPayments,
  onSelectedPaymentsChange,
  onLocationChange,
  refreshKey = 0,
  locationId,
}: TransactionTableProps) {
  const [connection, setConnection] = useState<SquareConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [locations, setLocations] = useState<SquareLocation[]>([]);
  const [selectedLocation, setSelectedLocation] =
    useState<SquareLocation | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [payments, setPayments] = useState<SquarePayment[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedLocationIdRef = useRef("");

  useEffect(() => {
    selectedLocationIdRef.current = selectedLocationId;
  }, [selectedLocationId]);

  const selectedPaymentKeySet = useMemo(() => {
    return new Set(selectedPayments.map((p) => getPaymentKey(p)));
  }, [selectedPayments]);

  const loadPaymentsForLocation = useCallback(
    async (
      activeConnection: SquareConnection,
      location: SquareLocation,
      shouldShowFullLoading = false,
    ) => {
      const squareLocationId = getSquareLocationId(location);
      if (!squareLocationId) {
        setPayments([]);
        setSelectedLocation(null);
        setSelectedLocationId("");
        selectedLocationIdRef.current = "";
        onLocationChange?.(null);
        onSelectedPaymentsChange([]);
        setErrorMessage("No Square location_id found for this location.");
        return;
      }
      try {
        if (shouldShowFullLoading) setIsLoading(true);
        else setIsLocationLoading(true);
        setErrorMessage(null);
        setSelectedLocation(location);
        setSelectedLocationId(squareLocationId);
        selectedLocationIdRef.current = squareLocationId;
        onLocationChange?.(location);
        const paymentData = await getSquarePayments(
          activeConnection.merchant_id,
          squareLocationId,
        );
        setPayments(paymentData);
        setCurrentPage(1);
        setIsExpanded(false);
        onSelectedPaymentsChange([]);
      } catch (error) {
        console.error(error);
        setPayments([]);
        setErrorMessage("Failed to load Square transactions for this branch.");
      } finally {
        setIsLoading(false);
        setIsLocationLoading(false);
      }
    },
    [onLocationChange, onSelectedPaymentsChange],
  );

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const connections = await getSquareConnections();
      const activeConnection =
        connections.find((c) => c.connection_status === "connected") ?? null;
      const anyConnection =
        activeConnection ??
        connections.find((c) => c.connection_status !== "deleted") ??
        null;
      if (!anyConnection) {
        setConnection(null);
        setIsConnected(false);
        setLocations([]);
        setSelectedLocation(null);
        setSelectedLocationId("");
        selectedLocationIdRef.current = "";
        setPayments([]);
        setCurrentPage(1);
        setIsExpanded(false);
        onSelectedPaymentsChange([]);
        onLocationChange?.(null);
        return;
      }
      setConnection(anyConnection);
      setIsConnected(!!activeConnection);
      const locationData = await getSquareLocations(anyConnection.merchant_id);
      setLocations(locationData);
      const currentSelectedLocationId = locationId ?? selectedLocationIdRef.current;
      const currentLocation =
        locationData.find(
          (l) => getSquareLocationId(l) === currentSelectedLocationId,
        ) ??
        locationData.find((l) => l.is_main_location) ??
        locationData.find((l) => getSquareLocationId(l)) ??
        null;
      if (!currentLocation) {
        setSelectedLocation(null);
        setSelectedLocationId("");
        selectedLocationIdRef.current = "";
        setPayments([]);
        setCurrentPage(1);
        setIsExpanded(false);
        onSelectedPaymentsChange([]);
        onLocationChange?.(null);
        setErrorMessage("No Square locations found for this merchant.");
        return;
      }
      await loadPaymentsForLocation(anyConnection, currentLocation, true);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "Failed to load Square transactions. Please reconnect your Square account.",
      );
      setConnection(null);
      setIsConnected(false);
      setLocations([]);
      setSelectedLocation(null);
      setSelectedLocationId("");
      selectedLocationIdRef.current = "";
      setPayments([]);
      setCurrentPage(1);
      setIsExpanded(false);
      onSelectedPaymentsChange([]);
      onLocationChange?.(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadPaymentsForLocation, locationId, onLocationChange, onSelectedPaymentsChange]);

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    setCurrentPage(1);
    setIsExpanded(false);
  }, [searchQuery, dateFilter, statusFilter, selectedLocationId]);

  const statusOptions = useMemo(() => {
    const statuses = new Set<string>();
    payments.forEach((p) => { if (p.status) statuses.add(p.status); });
    return Array.from(statuses);
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return payments.filter((p) => {
      const matchesSearch =
        query.length === 0 || getPaymentSearchText(p).includes(query);
      const matchesStatus =
        statusFilter === "all" || p.status === statusFilter;
      const matchesDate = isSameLocalDate(getPaymentDate(p), dateFilter);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [payments, searchQuery, statusFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const currentPagePayments = filteredPayments.slice(
    pageStartIndex,
    pageStartIndex + PAGE_SIZE,
  );
  const hasMoreOnCurrentPage = currentPagePayments.length > COLLAPSED_CARD_COUNT;
  const shouldShowPagination = filteredPayments.length > PAGE_SIZE;
  const listContainerClass =
    hasMoreOnCurrentPage && !isExpanded
      ? "max-h-[220px] space-y-1.5 overflow-y-auto pr-1"
      : "space-y-2";

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
      setIsExpanded(false);
    }
  }, [currentPage, totalPages]);

  function togglePaymentSelection(payment: SquarePayment) {
    const key = getPaymentKey(payment);
    if (selectedPaymentKeySet.has(key)) {
      onSelectedPaymentsChange(
        selectedPayments.filter((p) => getPaymentKey(p) !== key),
      );
    } else {
      onSelectedPaymentsChange([...selectedPayments, payment]);
    }
  }

  function clearFilters() {
    setSearchQuery("");
    setDateFilter("");
    setStatusFilter("all");
    setCurrentPage(1);
    setIsExpanded(false);
  }

  if (isLoading) {
    return (
      <Card className="rounded-2xl border shadow-sm">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!connection) {
    return (
      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold">Square未接続</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {errorMessage ?? "Squareアカウントを接続すると取引データを表示できます。"}
            </p>
          </div>
          <Button asChild className="rounded-xl">
            <Link href="/account/connect">Squareと接続する</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border shadow-sm">
      {!isConnected ? (
        <div className="flex items-center justify-between gap-3 rounded-t-2xl border-b border-amber-200 bg-amber-50 px-4 py-2.5">
          <p className="text-sm text-amber-700">
            Square接続が解除されています。新しいデータは同期されませんが、過去のデータは引き続き表示されます。
          </p>
          <Button asChild size="sm" variant="outline" className="shrink-0 rounded-lg border-amber-300 text-amber-700 hover:bg-amber-100">
            <Link href="/account/connect">再接続</Link>
          </Button>
        </div>
      ) : null}
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ReceiptText className="h-5 w-5" />
            Transactions
          </CardTitle>
          <CardDescription className="mt-1">
            {filteredPayments.length} Square payment
            {filteredPayments.length === 1 ? "" : "s"} found
            {selectedLocation?.name ? ` from ${selectedLocation.name}` : ""}.
            {selectedPayments.length > 0
              ? ` ${selectedPayments.length} selected.`
              : ""}
          </CardDescription>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_200px_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 rounded-xl bg-muted/60 pl-9 shadow-none"
              placeholder="Search payment ID, order ID..."
            />
          </div>

          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10 rounded-xl bg-muted/60 pl-9 shadow-none"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 rounded-xl bg-muted/60 shadow-none">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={6} className="rounded-xl">
              <SelectItem value="all">All status</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {formatStatus(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            onClick={clearFilters}
          >
            Clear
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLocationLoading ? (
          <p className="mb-3 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
            Loading transactions for selected branch...
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        {filteredPayments.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm font-medium">No Square transactions found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try changing the branch, search, or filter conditions.
            </p>
          </div>
        ) : (
          <>
            <div className={listContainerClass}>
              {currentPagePayments.map((payment) => {
                const paymentKey = getPaymentKey(payment);
                const paymentDate = getPaymentDate(payment);
                const isSelected = selectedPaymentKeySet.has(paymentKey);
                const detailHref = buildDetailHref(payment, selectedLocationId);

                return (
                  <div
                    key={paymentKey}
                    role="button"
                    tabIndex={0}
                    className={
                      isSelected
                        ? "rounded-xl border border-emerald-400/70 bg-emerald-50/70 p-2 shadow-sm outline-none transition hover:bg-emerald-50"
                        : "rounded-xl border bg-background p-2 shadow-sm outline-none transition hover:border-emerald-200 hover:bg-emerald-50/30"
                    }
                    onClick={() => togglePaymentSelection(payment)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        togglePaymentSelection(payment);
                      }
                    }}
                  >
                    {/* ✅ Top row: checkbox + title + detail button */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className="mt-0.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            aria-label={`Select transaction ${paymentKey}`}
                            onCheckedChange={() => togglePaymentSelection(payment)}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="break-all text-[10px] font-semibold uppercase leading-4 tracking-wide text-emerald-700">
                            Sales Receipt #{payment.payment_id ?? payment.id ?? "-"}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="h-4 w-1 shrink-0 rounded-full bg-emerald-600" />
                            <p className="truncate text-sm font-semibold text-emerald-950">
                              {getItemName(payment)}
                            </p>
                          </div>
                          <p className="break-all text-[10px] leading-4 text-muted-foreground">
                            Order ID: {payment.order_id ?? "-"}
                          </p>
                        </div>
                      </div>

                      {/* ✅ Detail button — always top-right */}
                      <div
                        className="shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg bg-background px-3"
                        >
                          <Link href={detailHref}>
                            詳細
                            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* ✅ Receipt meta — always 5 cols with horizontal scroll on tiny screens */}
                    <div className="mt-2 overflow-x-auto">
                      <div className="grid min-w-105 grid-cols-5 overflow-hidden rounded-lg border bg-border gap-px">
                        <ReceiptMeta
                          label="Date"
                          value={formatTransactionDateTime(paymentDate)}
                        />
                        <ReceiptMeta label="Qty" value={getQuantity(payment)} />
                        <ReceiptMeta
                          label="Unit Price"
                          value={formatSquareMoney(payment.amount, payment.currency ?? "JPY")}
                        />
                        <ReceiptMeta
                          label="Taxes & Fees"
                          value={getTaxesAndFees(payment)}
                        />
                        <ReceiptMeta
                          label="Total"
                          value={formatSquareMoney(payment.amount, payment.currency ?? "JPY")}
                          strong
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ✅ Footer */}
            <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
              <div className="text-xs text-muted-foreground">
                Showing {pageStartIndex + 1}–
                {Math.min(pageStartIndex + currentPagePayments.length, filteredPayments.length)}{" "}
                of {filteredPayments.length}
              </div>

              {hasMoreOnCurrentPage ? (
                <Button
                  type="button"
                  variant="outline"
                  className="group rounded-xl"
                  onClick={() => setIsExpanded((c) => !c)}
                >
                  {isExpanded ? (
                    <>縮小する <ChevronsUp className="ml-1 h-4 w-4" /></>
                  ) : (
                    <>拡大する <ChevronsDown className="ml-1 h-4 w-4 group-hover:animate-bounce" /></>
                  )}
                </Button>
              ) : null}

              {shouldShowPagination ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    disabled={safeCurrentPage === 1}
                    onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); setIsExpanded(false); }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-16 text-center text-sm font-medium">
                    {safeCurrentPage} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); setIsExpanded(false); }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ReceiptMeta({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0 bg-background px-2 py-1">
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={strong ? "mt-0.5 truncate text-sm font-bold text-emerald-950" : "mt-0.5 truncate text-sm font-semibold text-slate-900"}>
        {value}
      </p>
    </div>
  );
}