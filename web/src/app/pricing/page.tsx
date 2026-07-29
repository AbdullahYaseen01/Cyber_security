"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIERS } from "@/lib/tiers";
import { cn } from "@/lib/utils";

const FEATURE_ROWS = [
  { label: "Domains", key: "domains" },
  { label: "Scans/month", key: "scansPerMonth" },
  { label: "API Access", key: "apiAccess" },
  { label: "Team Seats", key: "teamSeats" },
  { label: "All Modules", key: "modules" },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);
  const tiers = Object.values(TIERS);

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-navy-950 to-navy-950" />

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <Link href="/" className="font-bold text-xl">QuantumShield</Link>
        <div className="flex gap-4">
          <Link href="/auth/login" className="text-slate-400 hover:text-white text-sm">Sign In</Link>
          <Button variant="glow" size="sm" asChild>
            <Link href="/auth/signup">Get Started</Link>
          </Button>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-slate-400 mb-8">No free tier. Every plan is paid. Start at just $1/month.</p>

          <div className="inline-flex items-center gap-3 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => setAnnual(false)}
              className={cn("px-4 py-2 rounded-lg text-sm transition-all", !annual && "bg-cyan-500/20 text-cyan-400")}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn("px-4 py-2 rounded-lg text-sm transition-all", annual && "bg-cyan-500/20 text-cyan-400")}
            >
              Annual <span className="text-green-400 text-xs ml-1">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {tiers.map((tier, i) => {
            const price = annual ? tier.annualPrice / 12 : tier.monthlyPrice;
            const isPopular = tier.id === "BUSINESS";
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "relative rounded-2xl border p-6 flex flex-col",
                  isPopular
                    ? "border-cyan-500/50 bg-cyan-500/5 glow-cyan"
                    : "border-white/10 bg-white/5"
                )}
              >
                {tier.badge && (
                  <span className={cn(
                    "absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full font-medium",
                    isPopular ? "bg-cyan-500 text-navy-950" : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  )}>
                    {tier.badge}
                  </span>
                )}
                <h3 className="text-lg font-semibold mt-2">{tier.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold font-mono">${price % 1 === 0 ? price : price.toFixed(2)}</span>
                  <span className="text-slate-400 text-sm">/mo</span>
                  {annual && <p className="text-xs text-slate-500 mt-1">billed ${tier.annualPrice}/year</p>}
                </div>
                <ul className="space-y-2 text-sm text-slate-300 flex-1 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    {tier.domains === "unlimited" ? "Unlimited" : tier.domains} domain{tier.domains !== 1 ? "s" : ""}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    {tier.scansPerMonth === "unlimited" ? "Unlimited" : tier.scansPerMonth} scans/mo
                  </li>
                  <li className="flex items-center gap-2">
                    {tier.apiAccess ? <Check className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-slate-600" />}
                    API Access
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    {tier.modules.length} modules
                  </li>
                </ul>
                <Button
                  variant={isPopular ? "glow" : "secondary"}
                  className="w-full"
                  asChild
                >
                  <Link href={`/auth/signup?tier=${tier.id}&cycle=${annual ? "annual" : "monthly"}`}>
                    {tier.id === "ENTERPRISE" ? "Contact Sales" : "Start 7-Day Trial"}
                  </Link>
                </Button>
              </motion.div>
            );
          })}
        </div>

        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-slate-400 font-medium">Feature</th>
                {tiers.map((t) => (
                  <th key={t.id} className="p-4 text-center font-medium">{t.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-white/5">
                  <td className="p-4 text-slate-400">{row.label}</td>
                  {tiers.map((t) => {
                    const val = t[row.key as keyof typeof t];
                    return (
                      <td key={t.id} className="p-4 text-center font-mono">
                        {typeof val === "boolean" ? (
                          val ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <X className="w-4 h-4 text-slate-600 mx-auto" />
                        ) : Array.isArray(val) ? (
                          val.length
                        ) : (
                          val === "unlimited" ? "∞" : String(val)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
