"use client";

import { Bell, Search, ChevronDown, Zap } from "lucide-react";
import { useAuthStore } from "@/store";
import { Progress } from "@/components/ui/progress";
import { TierBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Header() {
  const user = useAuthStore((s) => s.user);
  const scanPct = user ? (user.scansUsed / user.scansLimit) * 100 : 0;

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-white/10 bg-navy-950/60 backdrop-blur-xl flex items-center px-6 gap-4">
      <div className="flex-1 flex items-center gap-4">
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 text-sm hover:border-cyan-500/30 transition-colors min-w-[200px]"
        >
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="ml-auto text-xs bg-white/10 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </button>
      </div>

      {user && (
        <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 min-w-[180px]">
          <Zap className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Scans</span>
              <span className="font-mono text-cyan-400">
                {user.scansUsed}/{user.scansLimit}
              </span>
            </div>
            <Progress value={scanPct} className="h-1" />
          </div>
        </div>
      )}

      <button type="button" className="relative p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
      </button>

      {user ? (
        <button type="button" className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
            {user.name?.[0] ?? user.email[0].toUpperCase()}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm text-white leading-tight">{user.orgName}</p>
            <TierBadge tier={user.tier} />
          </div>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </button>
      ) : (
        <Button variant="glow" size="sm" asChild>
          <a href="/auth/signup">Get Started</a>
        </Button>
      )}
    </header>
  );
}
