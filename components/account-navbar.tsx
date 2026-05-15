"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SettingsDropdown } from "@/components/square/settings-dropdown";

const SHOW_CONNECT_NAV_KEY = "samurai_tax_show_connect_nav";

const ALL_NAV_ITEMS = [
  { href: "/account/location", label: "Admin", connectOnly: false },
  { href: "/account/connect", label: "Dashboard", connectOnly: true },
  { href: "/account/transactions", label: "Store", connectOnly: false },
];

export function AccountNavbar() {
  const pathname = usePathname();
  const [showConnect, setShowConnect] = useState(false);

  useEffect(() => {
    function syncPref() {
      setShowConnect(localStorage.getItem(SHOW_CONNECT_NAV_KEY) === "true");
    }
    syncPref();
    window.addEventListener("storage", syncPref);
    window.addEventListener("samurai:connect-nav-change", syncPref);
    return () => {
      window.removeEventListener("storage", syncPref);
      window.removeEventListener("samurai:connect-nav-change", syncPref);
    };
  }, []);

  const navItems = ALL_NAV_ITEMS.filter((item) => !item.connectOnly || showConnect);

  return (
    <header className="sticky top-0 z-30 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <span className="text-sm font-bold tracking-tight text-foreground">
          Samurai Tax
        </span>

        <nav className="flex items-center gap-1">
          {navItems.map(({ href, label }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto">
          <SettingsDropdown />
        </div>
      </div>
    </header>
  );
}
