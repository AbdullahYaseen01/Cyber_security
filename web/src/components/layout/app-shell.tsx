"use client";

import { useEffect } from "react";
import { useUIStore, useAuthStore } from "@/store";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { StatusBar } from "./status-bar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-navy-950 to-navy-950 pointer-events-none" />
      <Sidebar />
      <div
        className={cn(
          "transition-all duration-200 min-h-screen flex flex-col",
          sidebarCollapsed ? "ml-16" : "ml-60"
        )}
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

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, [setUser]);

  return <>{children}</>;
}
