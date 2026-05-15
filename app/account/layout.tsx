import { AccountNavbar } from "@/components/account-navbar";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AccountNavbar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
