"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import ConnectCard from "@/components/square/connect-card";
import { getSquareConnections } from "@/lib/square-api";
import type { SquareConnection } from "@/lib/square-types";

export default function ConnectPage() {
  const [isChecking, setIsChecking] = useState(true);
  const [connection, setConnection] = useState<SquareConnection | null>(null);

  const loadConnection = useCallback(async () => {
    try {
      setIsChecking(true);
      const connections = await getSquareConnections();
      const active =
        connections.find((item) => item.connection_status === "connected") ?? null;
      setConnection(active);
    } catch (error) {
      console.error(error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30">
        <Card className="gap-0 rounded-xl border bg-white px-8 py-10 text-center shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <p className="w-48 text-sm text-slate-500">接続状況を確認中...</p>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8 sm:px-6">
      <Suspense fallback={null}>
        <ConnectCard isConnected={!!connection} />
      </Suspense>
    </main>
  );
}
