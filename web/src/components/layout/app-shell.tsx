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
    <div className="min-h-screen bg-[#0B0F19] text-white text-[15px]">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/15 via-[#0B0F19] to-[#0B0F19] pointer-events-none" />
      <Sidebar />
      <div
        className="transition-[margin-left] duration-300 ease-out min-h-screen flex flex-col"
        style={{
          marginLeft: sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
        }}
      >
        <Header />
        <main className="flex-1 p-6 pb-12">{children}</main>
        <StatusBar />
      </div>
    </div>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    fetchSessionUser().then((user) => {
      if (!cancelled) setUser(mapSessionToStoreUser(user));
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, setUser]);

  return <>{children}</>;
}
