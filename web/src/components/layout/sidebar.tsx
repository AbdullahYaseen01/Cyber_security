"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, LogOut, Shield, Sparkles } from "lucide-react";
import { signOut } from "next-auth/react";
import { NAV_ITEMS } from "@/lib/constants";
import { canAccessModule } from "@/lib/tiers";
import { isDemoUser } from "@/lib/demo-auth";
import { useUIStore, useAuthStore } from "@/store";
import { cn } from "@/lib/utils";
import { LockBadge } from "@/components/ui/badge";

const EXPANDED_W = 260;
const COLLAPSED_W = 72;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const tier = user?.tier ?? "STARTER";
  const isDemo = isDemoUser(user);

  async function handleLogout() {
    setUser(null);
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  }

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? COLLAPSED_W : EXPANDED_W }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-white/[0.08] bg-[#070b14]/95 shadow-[4px_0_24px_rgba(0,0,0,0.35)]"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-[4.25rem] border-b border-white/[0.08]">
        <motion.div
          whileHover={{ scale: 1.05, rotate: 3 }}
          className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-cyan-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20"
        >
          <Shield className="w-5 h-5 text-white" />
        </motion.div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="overflow-hidden min-w-0"
            >
              <p className="font-bold text-white text-[15px] tracking-tight truncate">
                QuantumShield
              </p>
              {isDemo ? (
                <p className="text-[11px] text-cyan-400/90 font-medium flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3" />
                  Full Access Demo
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {user?.orgName ?? "Security Platform"}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5 space-y-1 scrollbar-thin">
        {NAV_ITEMS.filter((item) => {
          if (item.id === "settings") return false;
          // Ops Monitor: demo + org owners/admins only
          if (item.id === "admin") {
            return isDemo || user?.role === "OWNER" || user?.role === "ADMIN";
          }
          return true;
        }).map((item, index) => {
          const locked = !canAccessModule(tier, item.id, { isDemo });
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.25 }}
            >
              <Link
                href={locked ? "/pricing" : item.href}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  "group flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium transition-colors relative",
                  active
                    ? "text-cyan-100 bg-gradient-to-r from-cyan-500/15 to-purple-500/10"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]",
                  locked && "opacity-55"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-gradient-to-b from-cyan-400 to-purple-500"
                  />
                )}
                <Icon
                  className={cn(
                    "w-[1.35rem] h-[1.35rem] flex-shrink-0 transition-transform group-hover:scale-110",
                    active ? "text-cyan-400" : "text-slate-500 group-hover:text-cyan-300"
                  )}
                />
                {!sidebarCollapsed && (
                  <>
                    <span className="truncate flex-1">{item.label}</span>
                    {item.badge && !locked && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-200 font-medium">
                        {item.badge}
                      </span>
                    )}
                    {locked && <LockBadge />}
                  </>
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Footer: collapse + logout */}
      <div className="border-t border-white/[0.08] p-2 space-y-1">
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium",
            "text-red-300/90 hover:text-red-200 hover:bg-red-500/10 transition-colors"
          )}
        >
          <LogOut className="w-[1.35rem] h-[1.35rem] flex-shrink-0" />
          {!sidebarCollapsed && <span>Log Out</span>}
        </button>
        <button
          type="button"
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center h-10 rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.04] transition-colors"
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </motion.aside>
  );
}

export const SIDEBAR_WIDTH_EXPANDED = EXPANDED_W;
export const SIDEBAR_WIDTH_COLLAPSED = COLLAPSED_W;
