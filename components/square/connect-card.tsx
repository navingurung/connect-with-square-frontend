"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardDescription, CardContent } from "../ui/card";
import squareLogo from "@/public/images/Square_Logo_2025_Black.png";
import { Button } from "../ui/button";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { getSquareOAuthUrl } from "@/lib/square-api";

type ConnectCardProps = {
  isConnected?: boolean;
};

const ConnectCard = ({ isConnected = false }: ConnectCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // ✅ read ?error= from URL on mount
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError === "access_denied") {
      setError("Square連携がキャンセルされました。再度お試しください。");
    }
  }, [searchParams]);

  const handleConnectWithSquare = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSquareOAuthUrl();
      window.location.href = data.auth_url;
    } catch (err) {
      setError("Squareとの接続に失敗しました。再度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-lg rounded-xl border bg-background px-8 py-16 shadow-sm">
      <CardHeader className="space-y-5 text-center">
        <img
          src={squareLogo.src}
          alt="Square Logo"
          className="mx-auto h-12 w-auto"
        />
        <div className="space-y-2">
          <CardDescription className="text-sm leading-6 mx-auto text-muted-foreground">
            <span className="font-bold">Samurai Tax</span>と
            <span className="font-bold">Square POS</span>
            を接続して、支払い、注文、取引データを同期します。
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isConnected ? (
          <Button
            className="w-full h-12 rounded-md text-lg font-bold bg-emerald-600 hover:bg-emerald-600 text-white cursor-default"
            disabled
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            接続済み
          </Button>
        ) : (
          <Button
            className="w-full h-12 rounded-md text-lg font-bold"
            disabled={isLoading}
            onClick={handleConnectWithSquare}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                接続中です、少々お待ちください...
              </>
            ) : (
              "Squareに接続する"
            )}
          </Button>
        )}
        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Samurai TaxはSquareとの接続にOAuth
            2.0を使用しており、ユーザーの認証情報を安全に保護します。接続後、Squareからのデータは暗号化され、安全な方法でSamurai
            Taxに転送されます。
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConnectCard;
