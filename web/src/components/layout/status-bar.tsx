"use client";

import { useEffect, useState } from "react";
import { Activity, Wifi } from "lucide-react";
import { useAuthStore, useUIStore } from "@/store";
import { SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from "./sidebar";

export function StatusBar() {
  const user = useAuthStore((s) => s.user);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const [lastSync, setLastSync] = useState<string>("—");

  useEffect(() => {
    const update = () => setLastSync(new Date().toLocaleTimeString());
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer
      className="fixed bottom-0 z-20 h-8 border-t border-white/10 bg-[#070B14]/80 backdrop-blur-xl flex items-center px-4 gap-5 text-[11px] font-mono text-muted"
      style={{
        left: sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
        right: 0,
      }}
    >
      <div className="flex items-center gap-1.5">
        <Activity className="w-3 h-3 text-emerald-400" />
        <span>
          Active scans: <span className="text-cyan-300 font-medium">0</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Wifi className="w-3 h-3 text-emerald-400" />
        <span>
          System: <span className="text-emerald-300 font-medium">Healthy</span>
        </span>
      </div>
      <div className="ml-auto truncate">
        Last sync: {lastSync}
        {user?.orgId && (
          <span className="ml-4 text-subtle">org:{user.orgId.slice(0, 8)}</span>
        )}
      </div>
    </footer>
  );
}
