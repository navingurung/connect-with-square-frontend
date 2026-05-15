"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Power, Settings, Trash } from "lucide-react";

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

export function SettingsDropdown() {
  const [connection, setConnection] = useState<SquareConnection | null>(null);
  const [isAutoSync, setIsAutoSync] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  async function handleDisconnect() {
    if (!connection || isLoading) return;
    const confirmed = window.confirm(
      "Squareアカウントの接続を解除しますか？\nデータは保持されますが、新しいデータは同期されません。",
    );
    if (!confirmed) return;
    try {
      setIsLoading(true);
      await disconnectSquareConnection(connection.merchant_id);
      window.location.reload();
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!connection || isLoading) return;
    const confirmed = window.confirm(
      "本当にアカウントを削除しますか？\nこの操作は元に戻せません。",
    );
    if (!confirmed) return;
    try {
      setIsLoading(true);
      await deleteSquareConnection(connection.merchant_id);
      window.location.reload();
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  }

  // Don't render the gear icon at all when not connected
  if (!connection && !isLoading) return null;

  return (
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
                handleDisconnect();
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
                handleDelete();
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
  );
}
