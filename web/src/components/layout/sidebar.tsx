"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { canAccessModule } from "@/lib/tiers";
import { useUIStore } from "@/store";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";
import { LockBadge } from "@/components/ui/badge";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const tier = user?.tier ?? "STARTER";

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-white/10 bg-navy-950/80 backdrop-blur-2xl"
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!sidebarCollapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
            <p className="font-bold text-white text-sm tracking-tight">QuantumShield</p>
            <p className="text-[10px] text-cyan-400 font-mono">v7.1 ENTERPRISE</p>
          </motion.div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const locked = !canAccessModule(tier, item.id);
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={locked ? "/pricing" : item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative",
                active
                  ? "bg-cyan-500/10 text-cyan-300 border-l-2 border-cyan-400"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
                locked && "opacity-60"
              )}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", active && "text-cyan-400")} />
              {!sidebarCollapsed && (
                <>
                  <span className="truncate flex-1">{item.label}</span>
                  {item.badge && !locked && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      {item.badge}
                    </span>
                  )}
                  {locked && <LockBadge />}
                </>
              )}
              {active && (
                <motion.div
                  layoutId="sidebar-glow"
                  className="absolute inset-0 rounded-xl bg-cyan-500/5 -z-10"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-12 border-t border-white/10 text-slate-500 hover:text-white transition-colors"
        aria-label="Toggle sidebar"
      >
        {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </motion.aside>
  );
}
