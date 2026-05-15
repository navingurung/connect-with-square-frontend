"use client";

// ── Imports ───────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Power, Settings, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteSquareConnection,
  disconnectSquareConnection,
  getSquareConnections,
  updateSquareSyncSettings,
} from "@/lib/square-api";
import type { SquareConnection } from "@/lib/square-types";

export default function AccountManagePage() {
  // ── Router ────────────────────────────────────────────────────────────────
  // Used to redirect to transactions after disconnect or delete
  // merchant-summary-card will then detect no active connection and redirect to /account/connect
  const router = useRouter();

  // ── State ─────────────────────────────────────────────────────────────────
  const [connection, setConnection] = useState<SquareConnection | null>(null);
  const [isAutoSync, setIsAutoSync] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isLoadingSync, setIsLoadingSync] = useState(false);
  const [isLoadingDisconnect, setIsLoadingDisconnect] = useState(false);
  const [isLoadingDelete, setIsLoadingDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Load connection on mount ───────────────────────────────────────────────
  const loadConnection = useCallback(async () => {
    try {
      setIsPageLoading(true);
      setErrorMessage(null);

      const connections = await getSquareConnections();
      const active =
        connections.find((item) => item.connection_status === "connected") ??
        null;

      setConnection(active);
      setIsAutoSync(active?.auto_sync_enabled ?? false);
    } catch (error) {
      console.error(error);
      setErrorMessage("接続情報の取得に失敗しました。");
    } finally {
      setIsPageLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  // ── Auto sync toggle ───────────────────────────────────────────────────────
  async function handleAutoSyncToggle() {
    if (!connection) return;

    const next = !isAutoSync;

    try {
      setIsLoadingSync(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      await updateSquareSyncSettings(connection.merchant_id, next);

      setIsAutoSync(next);
      setSuccessMessage(
        next ? "自動同期をONにしました。" : "自動同期をOFFにしました。",
      );
    } catch (error) {
      console.error(error);
      setErrorMessage("自動同期設定の更新に失敗しました。");
    } finally {
      setIsLoadingSync(false);
    }
  }

  // ── Disconnect ────────────────────────────────────────────────────────────
  async function handleDisconnect() {
    if (!connection) return;

    const confirmed = window.confirm(
      "Squareアカウントの接続を解除しますか？\nデータは保持されますが、新しいデータは同期されません。",
    );

    if (!confirmed) return;

    try {
      setIsLoadingDisconnect(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      await disconnectSquareConnection(connection.merchant_id);

      setConnection(null);
      router.push("/account/transactions"); // ✅ was /account/connect
    } catch (error) {
      console.error(error);
      setErrorMessage("接続の解除に失敗しました。");
    } finally {
      setIsLoadingDisconnect(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!connection) return;

    const confirmed = window.confirm(
      "本当にアカウントを削除しますか？\nこの操作は元に戻せません。",
    );

    if (!confirmed) return;

    try {
      setIsLoadingDelete(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      await deleteSquareConnection(connection.merchant_id);

      setConnection(null);
      // after deletion, router redirects to connect page.
      router.push("/account/connect"); 
    } catch (error) {
      console.error(error);
      setErrorMessage("アカウントの削除に失敗しました。");
    } finally {
      setIsLoadingDelete(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Back button */}
        <Button asChild variant="outline" className="w-fit rounded-xl">
          <Link href="/account/transactions" className="flex items-center">
            <ChevronLeft className="mr-2 h-4 w-4" />
            戻る
          </Link>
        </Button>

        {/* Page title */}
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <Settings className="h-6 w-6 text-muted-foreground" />
            アカウント管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Samurai TaxのSquare接続設定を管理します。
          </p>
        </div>

        {/* Error message */}
        {errorMessage ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        {/* Success message */}
        {successMessage ? (
          <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        {/* Page loading state */}
        {isPageLoading ? (
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="flex items-center gap-3 p-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            </CardContent>
          </Card>
        ) : !connection ? (
          /* No active connection — show reconnect card */
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-semibold">
                  接続中のSquareアカウントがありません
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Square接続ページから再接続してください。
                </p>
              </div>
              <Button asChild className="rounded-xl">
                <Link href="/account/connect">Squareと接続する</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Active connection — show settings card */
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-lg font-semibold">
                アカウント設定
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 p-4 sm:p-6">
              {/* Auto sync toggle */}
              <div
                className={`rounded-2xl border p-4 transition sm:p-5 ${
                  isAutoSync ? "bg-muted" : "bg-background"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold">自動同期設定</h4>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                      <span className="font-semibold text-[#164d86]">
                        Samurai Tax
                      </span>
                      は定期的に
                      <span className="font-semibold text-foreground">
                        Square
                      </span>
                      アカウントと同期して、データを最新の状態に保ちます。
                      停止したい場合は、スイッチを
                      <span className="mr-0.5 font-semibold text-foreground">
                        {isAutoSync ? "OFF" : "ON"}
                      </span>
                      にしてください。
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-pressed={isAutoSync}
                    disabled={isLoadingSync}
                    onClick={handleAutoSyncToggle}
                    className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-50 ${
                      isAutoSync ? "bg-[#164d86]" : "bg-slate-300"
                    }`}
                  >
                    {isLoadingSync ? (
                      <Loader2 className="absolute inset-0 m-auto h-4 w-4 animate-spin text-white" />
                    ) : (
                      <span
                        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                          isAutoSync ? "right-1" : "left-1"
                        }`}
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* Disconnect and delete actions */}
              <Card className="rounded-2xl border shadow-none">
                <CardHeader className="border-b">
                  <CardTitle className="text-lg font-semibold">
                    アカウント無効化又は削除
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 p-4">
                  <ActionPanel
                    icon={<Power className="h-5 w-5" />}
                    title="アカウントの接続を解除"
                    description="Samurai TaxとSquareの接続を解除します。データは保持されますが、手動で再接続するまで新しいデータは同期されません。"
                    buttonLabel="接続を解除する"
                    buttonVariant="outline"
                    isLoading={isLoadingDisconnect}
                    onClickHandler={handleDisconnect}
                  />

                  <ActionPanel
                    icon={<Trash className="h-5 w-5" />}
                    title="アカウントを削除"
                    description="Samurai Taxアカウントを削除します。削除後はデータを復元できませんのでご注意ください。"
                    buttonLabel="削除する"
                    buttonVariant="destructive"
                    isLoading={isLoadingDelete}
                    onClickHandler={handleDelete}
                  />
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

// ── ActionPanel component ─────────────────────────────────────────────────────
function ActionPanel({
  icon,
  title,
  description,
  buttonLabel,
  buttonVariant,
  isLoading = false,
  onClickHandler,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  buttonVariant?: "outline" | "destructive";
  isLoading?: boolean;
  onClickHandler: () => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border bg-muted/20 p-4 sm:flex-row sm:items-center">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background">
          {icon}
        </div>

        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <Button
        type="button"
        className="w-full rounded-xl sm:w-fit"
        variant={buttonVariant}
        disabled={isLoading}
        onClick={onClickHandler}
      >
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {buttonLabel}
      </Button>
    </div>
  );
}