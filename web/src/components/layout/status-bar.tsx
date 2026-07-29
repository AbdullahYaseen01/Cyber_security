"use client";

import { Activity, Wifi } from "lucide-react";
import { useAuthStore } from "@/store";

export function StatusBar() {
  const user = useAuthStore((s) => s.user);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 h-8 border-t border-white/10 bg-navy-950/80 backdrop-blur-xl flex items-center px-4 gap-6 text-xs font-mono text-slate-500">
      <div className="flex items-center gap-1.5">
        <Activity className="w-3 h-3 text-green-500" />
        <span>Active scans: <span className="text-cyan-400">0</span></span>
      </div>
      <div className="flex items-center gap-1.5">
        <Wifi className="w-3 h-3 text-green-500" />
        <span>System: <span className="text-green-400">Healthy</span></span>
      </div>
      <div className="ml-auto">
        Last sync: {new Date().toLocaleTimeString()}
        {user && <span className="ml-4 text-slate-600">org:{user.orgId.slice(0, 8)}</span>}
      </div>
    </footer>
  );
}
