"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut, Shield, ShieldCheck, Sparkles } from "lucide-react";
import { signOut } from "next-auth/react";
import { NAV_ITEMS } from "@/lib/constants";
import { canAccessModule } from "@/lib/tiers";
import { isDemoUser } from "@/lib/demo-auth";
import { useUIStore, useAuthStore } from "@/store";
import { cn } from "@/lib/utils";
import { LockBadge } from "@/components/ui/badge";

const EXPANDED_W = 248;
const COLLAPSED_W = 68;

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

  const items = NAV_ITEMS.filter((item) => {
    if (item.id === "settings") return false;
    if (item.id === "admin") {
      return isDemo || user?.role === "OWNER" || user?.role === "ADMIN";
    }
    return true;
  });

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-white/10 bg-[#0A1220]/80 backdrop-blur-2xl transition-[width] duration-150 ease-out"
      style={{ width: sidebarCollapsed ? COLLAPSED_W : EXPANDED_W }}
    >
      <div className="flex items-center gap-2.5 px-3.5 h-14 border-b border-white/10 shrink-0">
        <div className="flex-shrink-0 w-9 h-9 rounded-[10px] bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Shield className="w-[18px] h-[18px] text-slate-950" strokeWidth={2.4} />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden min-w-0">
            <p className="font-bold text-[14.5px] tracking-tight truncate">QuantumShield</p>
            {isDemo ? (
              <p className="text-[11px] text-cyan-300 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Full access demo
              </p>
            ) : (
              <p className="text-[11px] text-subtle truncate">
                {user?.orgName ?? "Security platform"}
              </p>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2.5 px-2 space-y-0.5">
        {items.map((item) => {
          const locked = !canAccessModule(tier, item.id, { isDemo });
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={locked ? "/pricing" : item.href}
              prefetch
              title={sidebarCollapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[13.5px] font-medium",
                "transition-colors duration-75",
                active
                  ? "bg-cyan-400/12 text-cyan-100"
                  : "text-muted hover:text-foreground hover:bg-white/[0.05]",
                locked && "opacity-50"
              )}
            >
              {active && (
                <span className="absolute -left-2 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-cyan-400" />
              )}
              <Icon
                className={cn(
                  "w-[18px] h-[18px] flex-shrink-0",
                  active ? "text-cyan-300" : "text-subtle group-hover:text-cyan-300"
                )}
                strokeWidth={2}
              />
              {!sidebarCollapsed && (
                <>
                  <span className="truncate flex-1">{item.label}</span>
                  {item.badge && !locked && (
                    <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-200 font-semibold uppercase tracking-wide">
                      {item.badge}
                    </span>
                  )}
                  {locked && <LockBadge />}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {isDemo && !sidebarCollapsed && (
        <div className="mx-2 mb-1.5 shrink-0 rounded-[10px] border border-cyan-400/20 bg-cyan-400/10 p-2.5 backdrop-blur-md">
          <p className="text-[11px] font-semibold text-cyan-200 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Other portals
          </p>
          <div className="mt-1.5 flex flex-col gap-1">
            <Link href="/admin/login" className="text-[11.5px] text-muted hover:text-cyan-200 transition-colors">
              Login as admin →
            </Link>
            <Link href="/tester/login" className="text-[11.5px] text-muted hover:text-cyan-200 transition-colors">
              Login as tester →
            </Link>
          </div>
        </div>
      )}

      <div className="border-t border-white/10 p-2 space-y-0.5 shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[13.5px] font-medium text-rose-300/90 hover:text-rose-200 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={2} />
          {!sidebarCollapsed && <span>Log out</span>}
        </button>
        <button
          type="button"
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center h-8 rounded-[10px] text-subtle hover:text-foreground hover:bg-white/[0.05] transition-colors"
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}

export const SIDEBAR_WIDTH_EXPANDED = EXPANDED_W;
export const SIDEBAR_WIDTH_COLLAPSED = COLLAPSED_W;
