"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Power, Settings, Trash } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteSquareConnection,
  disconnectSquareConnection,
  getSquareConnections,
  updateSquareSyncSettings,
} from "@/lib/square-api";
import type { SquareConnection } from "@/lib/square-types";

type ConfirmAction = "disconnect" | "delete" | null;

export function SettingsDropdown() {
  const [connection, setConnection] = useState<SquareConnection | null>(null);
  const [isAutoSync, setIsAutoSync] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const loadConnection = useCallback(async () => {
    try {
      const connections = await getSquareConnections();
      const active =
        connections.find((c) => c.connection_status === "connected") ?? null;
      setConnection(active);
      setIsAutoSync(active?.auto_sync_enabled ?? false);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  async function handleAutoSyncToggle(e: Event) {
    e.preventDefault(); // keep dropdown open
    if (!connection || isLoading) return;
    const next = !isAutoSync;
    try {
      setIsLoading(true);
      await updateSquareSyncSettings(connection.merchant_id, next);
      setIsAutoSync(next);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmed() {
    if (!connection) return;
    try {
      setIsLoading(true);
      setConfirmAction(null);
      if (confirmAction === "disconnect") {
        await disconnectSquareConnection(connection.merchant_id);
      } else if (confirmAction === "delete") {
        await deleteSquareConnection(connection.merchant_id);
      }
      window.location.reload();
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  }

  // Don't render the gear icon at all when not connected
  if (!connection && !isLoading) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-lg" aria-label="設定">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Settings className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {connection ? (
            <>
              <DropdownMenuLabel>
                {connection.merchant_name ?? "Square アカウント"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Auto-sync toggle */}
              <DropdownMenuCheckboxItem
                checked={isAutoSync}
                onSelect={handleAutoSyncToggle}
                disabled={isLoading}
              >
                自動同期
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />

              {/* Disconnect */}
              <DropdownMenuItem
                className="text-amber-600 focus:bg-amber-50 focus:text-amber-700"
                disabled={isLoading}
                onSelect={(e) => {
                  e.preventDefault();
                  setConfirmAction("disconnect");
                }}
              >
                <Power className="h-4 w-4" />
                接続を解除
              </DropdownMenuItem>

              {/* Delete */}
              <DropdownMenuItem
                variant="destructive"
                disabled={isLoading}
                onSelect={(e) => {
                  e.preventDefault();
                  setConfirmAction("delete");
                }}
              >
                <Trash className="h-4 w-4" />
                アカウントを削除
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuLabel className="text-muted-foreground">
                未接続
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/account/connect">Squareと接続する</Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Disconnect confirmation */}
      <AlertDialog
        open={confirmAction === "disconnect"}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>接続を解除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              Squareアカウントの接続を解除します。データは保持されますが、新しいデータは同期されません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleConfirmed}
            >
              解除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={confirmAction === "delete"}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>アカウントを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。すべての接続データが完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleConfirmed}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
