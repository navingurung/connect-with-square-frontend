// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { Loader2 } from "lucide-react";

// import { Card } from "@/components/ui/card";
// import { getSquareConnections } from "@/lib/square-api";

// export default function SquareConnectCallbackPage() {
//   const router = useRouter();
//   const [message, setMessage] = useState("Square接続状況を確認中...");

//   useEffect(() => {
//     async function verifyConnection() {
//       try {
//         const connections = await getSquareConnections();
//         const connection = connections[0];

//         if (connection) {
//           setMessage("Square接続が完了しました。取引一覧へ移動します...");
//           router.replace("/account/transactions");
//           return;
//         }

//         setMessage("Square接続を確認できませんでした。接続画面へ戻ります...");
//         router.replace("/account/connect");
//       } catch (error) {
//         console.error(error);
//         setMessage("Square接続確認中にエラーが発生しました。");
//         router.replace("/account/connect");
//       }
//     }

//     verifyConnection();
//   }, [router]);

//   return (
//     <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
//       <Card className="gap-0 rounded-xl border bg-white px-8 py-10 text-center shadow-sm">
//         <div className="flex flex-col items-center gap-4">
//           <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
//           <div>
//             <h1 className="text-base font-semibold text-slate-900">
//               Square接続処理中
//             </h1>
//             <p className="mt-2 text-sm text-slate-500">{message}</p>
//           </div>
//         </div>
//       </Card>
//     </main>
//   );
// }



"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getSquareConnections } from "@/lib/square-api";

export default function SquareConnectCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Square接続状況を確認中...");

  useEffect(() => {
    async function verifyConnection() {
      try {
        const connections = await getSquareConnections();

        // ✅ FIX: only accept a truly connected connection
        const connection = connections.find(
          (item) => item.connection_status === "connected",
        );

        if (connection) {
          setMessage("Square接続が完了しました。");
          router.replace("/account/connect");
          return;
        }

        setMessage("Square接続を確認できませんでした。接続画面へ戻ります...");
        router.replace("/account/connect");
      } catch (error) {
        console.error(error);
        setMessage("Square接続確認中にエラーが発生しました。");
        router.replace("/account/connect");
      }
    }

    verifyConnection();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <Card className="gap-0 rounded-xl border bg-white px-8 py-10 text-center shadow-sm">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <div>
            <h1 className="text-base font-semibold text-slate-900">
              Square接続処理中
            </h1>
            <p className="mt-2 text-sm text-slate-500">{message}</p>
          </div>
        </div>
      </Card>
    </main>
  );
}