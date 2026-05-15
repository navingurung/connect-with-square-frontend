"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Settings } from "lucide-react";

import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import squareLogo from "@/public/images/Square_Logo_2025_Black.png";
import { getSquareConnections, getSquareMerchant } from "@/lib/square-api";
import type { SquareConnection, SquareMerchant } from "@/lib/square-types";

type MerchantSummaryCardProps = {
  onSyncComplete?: () => void;
};

type SyncMessageType = "success" | "error";

// ── Helper: format sync time label ────────────────────────────────────────────
// Converts a date string into a human-readable "X 時間前" or "in X 分" label
function formatSyncLabel(date?: string | null, fallback = "-") {
  if (!date) return fallback;

  const targetTime = new Date(date).getTime();

  if (Number.isNaN(targetTime)) return fallback;

  const diffMs = new Date().getTime() - targetTime;
  const absHours = Math.round(Math.abs(diffMs) / (1000 * 60 * 60));

  if (absHours < 1) {
    return diffMs < 0
      ? `in ${Math.round(Math.abs(diffMs) / (1000 * 60))} 分`
      : `${Math.round(diffMs / (1000 * 60))} 分前`;
  }

  return diffMs < 0 ? `in ${absHours} 時間` : `${absHours} 時間前`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

// Displays a sync label and value pair (Last Sync / Next Sync)
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

// Displays an inline error message inside a red card
function ErrorInfo({ message }: { message: string }) {
  return (
    <Card className="gap-0 overflow-hidden rounded-sm border bg-red-50 py-3 shadow-none">
      <p className="text-sm font-medium leading-5 text-red-800/60">{message}</p>
    </Card>
  );
}

// Loading bar shown while manual sync is running
function SyncLoadingBar() {
  return (
    <div className="border-t px-5 py-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-emerald-800/70">
          Square transactions are syncing...
        </p>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-700" />
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-emerald-100">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-emerald-600" />
      </div>
    </div>
  );
}

// Success or error message shown after sync completes, auto-hides after 3.5s
function SyncStatusMessage({
  message,
  type,
}: {
  message: string;
  type: SyncMessageType;
}) {
  const className =
    type === "success"
      ? "border-t bg-emerald-50 px-5 py-3 text-emerald-700"
      : "border-t bg-red-50 px-5 py-3 text-red-700";

  return (
    <div className={className}>
      <p className="text-xs font-medium">{message}</p>
    </div>
  );
}

// Skeleton card shown while merchant data is loading on first mount
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

// Error card shown when connection is null and an error occurred
function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="gap-0 rounded-sm border bg-white px-5 py-3 shadow-none">
      <p className="text-sm font-medium text-red-600">{message}</p>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function MerchantSummaryCard({
  onSyncComplete,
}: MerchantSummaryCardProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [connection, setConnection] = useState<SquareConnection | null>(null);
  const [merchantName, setMerchantName] = useState<SquareMerchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(
    null,
  );
  const [syncStatusType, setSyncStatusType] =
    useState<SyncMessageType>("success");

  const router = useRouter();

  // ── Interval ref for auto-sync ─────────────────────────────────────────────
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Auto-hide sync status message after 3.5s ───────────────────────────────
  useEffect(() => {
    if (!syncStatusMessage) return;

    const timer = window.setTimeout(() => {
      setSyncStatusMessage(null);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [syncStatusMessage]);

  // ── Load merchant data ─────────────────────────────────────────────────────
  // Called on mount (isManualSync = false) or when user clicks sync button (isManualSync = true)
  // ✅ FIX: only picks connection with connection_status === "connected"
  //         If deleted/disconnected → redirects to /account/connect for re-auth
  const loadMerchantData = useCallback(
    async (isManualSync = false) => {
      let shouldRefreshTransactions = false;
      let nextSyncMessage: string | null = null;
      let nextSyncMessageType: SyncMessageType = "success";

      try {
        if (isManualSync) {
          setIsSyncing(true);
          setSyncStatusMessage(null);
        } else {
          setIsLoading(true);
        }

        setErrorMessage(null);

        const connections = await getSquareConnections();

        // ✅ only use a connection that is actually connected
        // If deleted or disconnected, token is empty → would cause 401
        const activeConnection =
          connections.find((item) => item.connection_status === "connected") ??
          null;

        // ✅ no active connection → show nothing, do not redirect
        if (!activeConnection) {
          setConnection(null);
          setIsLoading(false);
          return;
        }

        setConnection(activeConnection);

        if (isManualSync) {
          shouldRefreshTransactions = true;
        }

        // Fetch merchant info using the active connection's merchant ID
        try {
          const merchantData = await getSquareMerchant(
            activeConnection.merchant_id,
          );

          setMerchantName(merchantData);

          if (isManualSync) {
            nextSyncMessage = "同期が完了しました。取引一覧を更新しました。";
            nextSyncMessageType = "success";
          }
        } catch (error) {
          console.error("Error fetching merchant data:", error);

          // Merchant fetch failure does not redirect — connection still exists
          // Just show the error banner inside the card
          setMerchantName(null);
          setErrorMessage(
            "データの取得に失敗しました。もう一度同期してください。",
          );

          if (isManualSync) {
            nextSyncMessage =
              "取引一覧は更新しましたが、加盟店情報の取得に失敗しました。";
            nextSyncMessageType = "error";
          }
        }
      } catch (error) {
        console.error("データ取得エラー:", error);

        // Connection fetch failed entirely → show error and redirect to re-auth
        setErrorMessage(
          "接続情報の取得に失敗しました。もう一度同期してください。",
        );
        setConnection(null);
        setMerchantName(null);

        if (isManualSync) {
          nextSyncMessage = "同期に失敗しました。もう一度お試しください。";
          nextSyncMessageType = "error";
        }
      } finally {
        setIsLoading(false);
        setIsSyncing(false);

        if (shouldRefreshTransactions) {
          onSyncComplete?.();
        }

        if (isManualSync && nextSyncMessage) {
          setSyncStatusType(nextSyncMessageType);
          setSyncStatusMessage(nextSyncMessage);
        }
      }
    },
    [router, onSyncComplete],
  );

  // Load on mount
  useEffect(() => {
    loadMerchantData();
  }, [loadMerchantData]);

  // ── Auto-sync interval ─────────────────────────────────────────────────────
  // Reads auto_sync_enabled from DB (set by toggle on /account/manage)
  // If ON → refetches + refreshes transactions every 2 hours
  // If OFF → clears interval
  useEffect(() => {
    if (!connection?.auto_sync_enabled) {
      // auto-sync is OFF — clear interval if running
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // auto-sync is ON — start interval
    intervalRef.current = setInterval(
      () => {
        loadMerchantData(true); // ✅ refetches + triggers onSyncComplete → refreshes transactions
      },
      2 * 60 * 60 * 1000,
    ); // every 2 hours

    // cleanup on unmount or when auto_sync_enabled changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [connection?.auto_sync_enabled, loadMerchantData]);

  // ── Merchant display name ──────────────────────────────────────────────────
  // Falls back through multiple fields to find the best display name
  const merchantDisplayName = useMemo(() => {
    if (!connection) return "-";

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
      connection?.created_at,
  );

  // ✅ calculate from last_synced_at + 2 hours (only show when auto-sync is ON)
  const nextSyncDate =
    connection?.auto_sync_enabled && connection?.last_synced_at
      ? new Date(
          new Date(connection?.last_synced_at).getTime() + 2 * 60 * 60 * 1000,
        ).toISOString()
      : null;

  const nextSyncLabel = formatSyncLabel(nextSyncDate, "-");

  // ── Render ─────────────────────────────────────────────────────────────────

  // Show skeleton while loading on first mount
  if (isLoading) {
    return <LoadingCard />;
  }

  // Show error card if connection failed entirely
  if (!connection && errorMessage) {
    return <ErrorCard message={errorMessage} />;
  }

  // Fallback to skeleton if no connection and no error
  if (!connection) {
    return <LoadingCard />;
  }

  return (
    <Card className="gap-0 overflow-hidden rounded-sm border bg-white py-0 shadow-none">
      {/* Top row: Square logo + sync info + sync button */}
      <div className="flex items-center justify-between gap-4 px-5 py-2">
        <Image
          src={squareLogo}
          alt="Square Logo"
          className="h-7 w-auto object-contain"
          priority
        />

        <div className="flex items-center gap-4">
          <SyncInfo label="Last Sync" value={lastSyncLabel} />
          <SyncInfo label="Next Sync" value={nextSyncLabel} />

          <Button
            type="button"
            size="icon"
            aria-label="Sync Now"
            onClick={() => loadMerchantData(true)}
            className="h-8 w-8 rounded text-white hover:bg-emerald-600"
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Bottom row: merchant name */}
      <div className="flex items-center border-t px-5 py-3">
        <p className="truncate text-sm font-medium text-slate-700">
          {merchantDisplayName}
        </p>
      </div>

      {/* Sync loading bar */}
      {isSyncing && <SyncLoadingBar />}

      {/* Sync result message (auto-hides after 3.5s) */}
      {!isSyncing && syncStatusMessage && (
        <SyncStatusMessage message={syncStatusMessage} type={syncStatusType} />
      )}

      {/* Inline error banner */}
      {errorMessage && (
        <div className="px-5 py-3">
          <ErrorInfo message={errorMessage} />
        </div>
      )}
    </Card>
  );
}
