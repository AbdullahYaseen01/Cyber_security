"use client";

import { Bell, Search, Zap } from "lucide-react";
import { useAuthStore } from "@/store";
import { Progress } from "@/components/ui/progress";
import { TierBadge } from "@/components/ui/badge";

export function Header() {
  const user = useAuthStore((s) => s.user);
  const scanPct = user && user.scansLimit ? (user.scansUsed / user.scansLimit) * 100 : 0;

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-white/10 bg-[#070B14]/70 backdrop-blur-2xl flex items-center px-5 gap-3">
      <button
        type="button"
        className="flex items-center gap-2 px-2.5 h-8 rounded-[9px] border border-white/10 bg-white/[0.04] text-subtle text-[13px] w-[220px]"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search</span>
        <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/10 font-mono text-subtle">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1" />

      {user && user.scansLimit < 9999 && (
        <div className="hidden md:flex items-center gap-2.5 px-2.5 h-8 rounded-[9px] border border-white/10 bg-white/[0.04] min-w-[164px]">
          <Zap className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-[10.5px] leading-none mb-1">
              <span className="text-subtle">Scans</span>
              <span className="font-mono text-cyan-300">
                {user.scansUsed}/{user.scansLimit}
              </span>
            </div>
            <Progress value={scanPct} className="h-1" />
          </div>
        </div>
      )}

      <button
        type="button"
        className="relative w-8 h-8 grid place-items-center rounded-[9px] text-muted hover:text-foreground hover:bg-white/5 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-[17px] h-[17px]" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-400 rounded-full ring-2 ring-[#070B14]" />
      </button>

      {user && (
        <div className="flex items-center gap-2.5 pl-2.5 border-l border-white/10">
          <div className="hidden sm:block text-right">
            <p className="text-[13px] font-medium leading-tight">{user.orgName}</p>
            <TierBadge tier={user.tier} />
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 grid place-items-center text-[13px] font-bold text-slate-950">
            {(user.name?.[0] ?? user.email[0]).toUpperCase()}
          </div>
        </div>
      )}
    </header>
  );
}
