"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUIStore, useAuthStore } from "@/store";
import { Sidebar, SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from "./sidebar";
import { Header } from "./header";
import { StatusBar } from "./status-bar";
import { fetchSessionUser, mapSessionToStoreUser } from "@/lib/session-client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen text-[14px] text-foreground">
      <Sidebar />
      <div
        className="transition-[margin-left] duration-150 ease-out min-h-screen flex flex-col"
        style={{
          marginLeft: sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
        }}
      >
        <Header />
        {/* pb-10 clears the fixed status bar so content / buttons are never clipped */}
        <main className="flex-1 px-6 py-5 pb-10">{children}</main>
        <StatusBar />
      </div>
    </div>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();

  useEffect(() => {
    if (user) return;
    let cancelled = false;
    fetchSessionUser().then((payload) => {
      if (!cancelled) setUser(mapSessionToStoreUser(payload));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname === "/login", setUser]);

  return <>{children}</>;
}
