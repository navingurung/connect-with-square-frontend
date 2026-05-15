"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, MapPin, Pencil, RotateCcw, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getSquareConnections, getSquareLocations, getSquareMerchant } from "@/lib/square-api";

const LOCATION_ID_KEY = "samurai_tax_location_id";
const SHOW_CONNECT_NAV_KEY = "samurai_tax_show_connect_nav";

export default function LocationPage() {
  const [isChecking, setIsChecking] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState<string | null>(null);
  const [locationIdInput, setLocationIdInput] = useState("");
  const [savedLocationId, setSavedLocationId] = useState<string | null>(null);
  const [savedLocationName, setSavedLocationName] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);
  const [showConnectNav, setShowConnectNav] = useState(false);

  // Read stored preference on mount
  useEffect(() => {
    setShowConnectNav(localStorage.getItem(SHOW_CONNECT_NAV_KEY) === "true");
    const saved = localStorage.getItem(LOCATION_ID_KEY);
    if (saved) setSavedLocationId(saved);
  }, []);

  function handleConnectNavToggle(checked: boolean) {
    setShowConnectNav(checked);
    localStorage.setItem(SHOW_CONNECT_NAV_KEY, String(checked));
    window.dispatchEvent(new CustomEvent("samurai:connect-nav-change", { detail: checked }));
  }

  useEffect(() => {
    async function checkConnection() {
      try {
        const connections = await getSquareConnections();
        const active = connections.find(
          (item) => item.connection_status === "connected",
        );
        if (!active) {
          // Not connected — still show the page, just without merchant info
          setIsConnected(false);
          setIsChecking(false);
          return;
        }
        setIsConnected(true);
        setMerchantId(active.merchant_id);

        // Merchant display name
        const nameFromConnection = active.merchant_name ?? null;
        if (nameFromConnection) {
          setMerchantName(nameFromConnection);
        } else {
          try {
            const merchant = await getSquareMerchant(active.merchant_id);
            setMerchantName(
              merchant.merchant_name ?? merchant.business_name ?? merchant.name ?? null,
            );
          } catch {
            // non-critical
          }
        }

        // Restore saved location name
        const saved = localStorage.getItem(LOCATION_ID_KEY);
        if (saved) {
          setSavedLocationId(saved);
          try {
            const locations = await getSquareLocations(active.merchant_id);
            const match = locations.find(
              (l) => (l.location_id ?? String(l.id ?? "")) === saved,
            );
            setSavedLocationName(match?.name ?? match?.business_name ?? null);
          } catch {
            // non-critical
          }
        }
      } catch (error) {
        console.error(error);
        // API error — show page without connection info rather than redirecting
        setIsConnected(false);
        return;
      } finally {
        setIsChecking(false);
      }
    }
    checkConnection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    if (!locationIdInput) return;
    try {
      localStorage.setItem(LOCATION_ID_KEY, locationIdInput);
      // Look up shop name only when connected
      let name: string | null = null;
      if (merchantId) {
        try {
          const locations = await getSquareLocations(merchantId);
          const match = locations.find(
            (l) => (l.location_id ?? String(l.id ?? "")) === locationIdInput,
          );
          name = match?.name ?? match?.business_name ?? null;
        } catch {
          // non-critical
        }
      }
      setSavedLocationId(locationIdInput);
      setSavedLocationName(name);
      setIsEditing(false);
      setSaveStatus("success");
    } catch {
      setSaveStatus("error");
    }
  }

  function handleReset() {
    localStorage.removeItem(LOCATION_ID_KEY);
    setSavedLocationId(null);
    setSavedLocationName(null);
    setLocationIdInput("");
    setSaveStatus(null);
    setIsEditing(false);
  }

  if (isChecking) {
    return (
      <main className="flex min-h-screen min-w-full items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <p className="text-sm text-slate-500">確認中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6">
        {/* Toggle above card */}
        <div className="mb-6 flex w-full max-w-lg items-center justify-between rounded-xl border bg-background px-5 py-3 shadow-sm">
          <span className="text-sm font-medium">ナビに接続ページを表示</span>
          <Switch checked={showConnectNav} onCheckedChange={handleConnectNavToggle} />
        </div>

        <Card className="w-full max-w-lg rounded-xl border bg-background px-8 py-12 shadow-sm">
          <CardHeader className="mb-6 space-y-3 p-0 text-center">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <MapPin className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold">ロケーションを設定</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                表示する店舗のロケーションIDを入力してください。
              </p>
            </div>
            {merchantName ? (
              <p className="text-sm text-muted-foreground">
                会社名【接続中】：<span className="font-semibold text-foreground">  {merchantName}</span>
              </p>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-4 p-0">            {/* Disconnected notice */}
            {!isConnected ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>現在Squareに未接続です。ロケーシンIDを保存しておくことはできます。再接続後にそのまま適用されます。</span>
              </div>
            ) : null}            {saveStatus === "success" ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                ロケーションIDを保存しました。
              </div>
            ) : saveStatus === "error" ? (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <XCircle className="h-4 w-4 shrink-0" />
                保存に失敗しました。再度お試しください。
              </div>
            ) : null}

            {savedLocationId && !isEditing ? (
              /* ── Locked state ── */
              <div className="space-y-3">
                    {savedLocationName ? (
                      <p className="text-sm text-muted-foreground">
                        店舗：<span className="font-semibold text-foreground">{savedLocationName}</span>
                      </p>
                    ) : null}
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">ロケーションID</p>
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 flex-1 items-center rounded-lg border bg-muted/50 px-3 font-mono text-sm text-foreground">
                      {savedLocationId}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-lg"
                      onClick={() => {
                        setLocationIdInput(savedLocationId ?? "");
                        setSaveStatus(null);
                        setIsEditing(true);
                      }}
                      aria-label="編集"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={handleReset}
                      aria-label="リセット"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Input form ── */
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="location-id-input" className="text-sm font-medium">
                    ロケーションID
                  </label>
                  <Input
                    id="location-id-input"
                    value={locationIdInput}
                    onChange={(e) => setLocationIdInput(e.target.value.trim())}
                    placeholder="例: LXXXXXXXXXXXXXXXXX"
                    className="rounded-lg"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && locationIdInput) {
                        handleSubmit();
                      }
                    }}
                  />
                </div>

                <div className="flex gap-2">
                  {isEditing ? (
                    <Button
                      variant="outline"
                      className="h-11 flex-1 rounded-lg"
                      onClick={() => {
                        setIsEditing(false);
                        setLocationIdInput("");
                        setSaveStatus(null);
                      }}
                    >
                      キャンセル
                    </Button>
                  ) : null}
                  <Button
                    className="h-11 flex-1 rounded-lg font-semibold"
                    disabled={!locationIdInput}
                    onClick={handleSubmit}
                  >
                    保存する
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
