"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Shield } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

export type PortalNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function PortalShell({
  title,
  subtitle,
  accent,
  nav,
  children,
  loginPath,
}: {
  title: string;
  subtitle: string;
  accent: string;
  nav: PortalNavItem[];
  children: React.ReactNode;
  loginPath: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await signOut({ redirect: false });
    router.push(loginPath);
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-[var(--background)]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center gap-4">
          <div className={cn("w-8 h-8 rounded-[9px] grid place-items-center", accent)}>
            <Shield className="w-4 h-4 text-[#0b1220]" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold tracking-tight">{title}</p>
            <p className="text-[11px] text-subtle truncate">{subtitle}</p>
          </div>
          <nav className="hidden md:flex items-center gap-1 ml-6">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 h-8 rounded-[8px] text-[13px] font-medium transition-colors",
                    active
                      ? "bg-white/[0.08] text-foreground"
                      : "text-muted hover:text-foreground hover:bg-white/[0.04]"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex-1" />
          <Link href="/login" className="text-[12px] text-muted hover:text-cyan-300 transition-colors">
            Client
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-[12.5px] text-rose-300/90 hover:text-rose-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log out
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-5 py-6">{children}</main>
    </div>
  );
}
