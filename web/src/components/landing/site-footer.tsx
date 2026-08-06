import Link from "next/link";
import { Shield } from "lucide-react";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/products#autonomous-pentest", label: "QuantumStrike AI" },
      { href: "/products#deep-scanner", label: "Deep Scanner" },
      { href: "/products#identity-control", label: "Identity Control" },
      { href: "/products#ai-defense", label: "Adaptive AI Defense" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: "/dashboard/api-security", label: "API Security" },
      { href: "/dashboard/cloud-guard", label: "Cloud Guard" },
      { href: "/dashboard/phishing-shield", label: "Phishing Shield" },
      { href: "/dashboard/dark-web", label: "Dark Web Intel" },
      { href: "/dashboard/compliance", label: "Compliance Hub" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/#compare", label: "Why QuantumShield" },
      { href: "/#faq", label: "FAQ" },
      { href: "/login", label: "Sign in" },
      { href: "/signup?tier=FREE", label: "Start free" },
      { href: "/api/auth/demo-login?portal=client", label: "Live demo" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.06] bg-[#050810]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4 md:px-8">
        <div>
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">QuantumShield</span>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-slate-500">
            The unified cybersecurity operating system — autonomous pentest, attack-surface scanning,
            identity control, AI defense, cloud, and compliance in one console.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {col.title}
            </p>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-slate-400 transition-colors hover:text-cyan-300">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/[0.04] px-5 py-5 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} QuantumShield. All rights reserved.</span>
          <span className="font-mono text-[11px] text-slate-500">
            LIVE · Deep Scanner · QuantumStrike AI · Identity · Compliance
          </span>
        </div>
      </div>
    </footer>
  );
}
