"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TIERS,
  PRICING_MODULES,
  getPricingFeatures,
  getTierMonthlyEquivalent,
  getBillingBilledLabel,
  type BillingCycle,
  type TierId,
} from "@/lib/tiers";
import { cn } from "@/lib/utils";
import { BillingCycleToggle } from "@/components/pricing/billing-cycle-toggle";
import { SiteNav } from "@/components/landing/site-nav";
import { SiteFooter } from "@/components/landing/site-footer";

function FeatureItem({ label, included }: { label: string; included: boolean }) {
  return (
    <li className="flex items-start gap-2">
      {included ? (
        <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
      ) : (
        <X className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
      )}
      <span className={cn("text-sm leading-snug", included ? "text-slate-300" : "text-slate-600")}>
        {label}
      </span>
    </li>
  );
}

function ctaLabel(tierId: TierId) {
  if (tierId === "FREE") return "Start free";
  if (tierId === "ENTERPRISE") return "Contact Sales";
  return "Start trial";
}

export default function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>("annual");
  const tiers = Object.values(TIERS);

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-navy-950 to-navy-950" />

      <SiteNav />

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-slate-400 mb-2 max-w-2xl mx-auto">
            Free forever for 1 domain and 1 scan/month. Paid plans unlock QuantumStrike AI, identity,
            AI defense, cloud, phishing, and compliance.
          </p>
          <p className="text-slate-500 text-sm mb-8">
            Start with Deep Scanner on your real infrastructure — upgrade only when you outgrow Free.
          </p>

          <BillingCycleToggle value={cycle} onChange={setCycle} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 mb-16">
          {tiers.map((tier, i) => {
            const price = getTierMonthlyEquivalent(tier, cycle);
            const billedLabel = getBillingBilledLabel(tier, cycle);
            const isPopular = tier.id === "BUSINESS";
            const isFree = tier.id === "FREE";
            const { limits, modules, scanModes } = getPricingFeatures(tier);

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={cn(
                  "relative rounded-2xl border p-5 flex flex-col",
                  isPopular
                    ? "border-cyan-500/50 bg-cyan-500/5 glow-cyan"
                    : isFree
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-white/10 bg-white/5"
                )}
              >
                {tier.badge && (
                  <span
                    className={cn(
                      "absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap",
                      isFree
                        ? "bg-emerald-500 text-navy-950"
                        : isPopular
                          ? "bg-cyan-500 text-navy-950"
                          : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    )}
                  >
                    {tier.badge}
                  </span>
                )}
                <h3 className="text-lg font-semibold mt-2">{tier.name}</h3>
                <div className="mt-4 mb-5">
                  <span className="text-4xl font-bold font-mono">
                    ${price % 1 === 0 ? price : price.toFixed(2)}
                  </span>
                  <span className="text-slate-400 text-sm">/mo</span>
                  {billedLabel && <p className="text-xs text-slate-500 mt-1">{billedLabel}</p>}
                </div>

                <div className="flex-1 mb-6 space-y-4">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                      Limits
                    </p>
                    <ul className="space-y-1.5">
                      {limits.map((f) => (
                        <FeatureItem key={f.label} {...f} />
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                      Modules
                    </p>
                    <ul className="space-y-1.5">
                      {modules.map((f) => (
                        <FeatureItem key={f.label} {...f} />
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                      Scan Modes
                    </p>
                    <ul className="space-y-1.5">
                      {scanModes.map((f) => (
                        <FeatureItem key={f.label} {...f} />
                      ))}
                    </ul>
                  </div>
                </div>

                <Button variant={isFree || isPopular ? "glow" : "secondary"} className="w-full" asChild>
                  <Link href={`/signup?tier=${tier.id}&cycle=${cycle}`}>{ctaLabel(tier.id)}</Link>
                </Button>
              </motion.div>
            );
          })}
        </div>

        <div className="glass overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-slate-400 font-medium">Feature</th>
                {tiers.map((t) => (
                  <th key={t.id} className="p-4 text-center font-medium">
                    {t.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: "Domains",
                  get: (t: (typeof tiers)[0]) => (t.domains === "unlimited" ? "∞" : t.domains),
                },
                {
                  label: "Scans/month",
                  get: (t: (typeof tiers)[0]) =>
                    t.scansPerMonth === "unlimited" ? "∞" : t.scansPerMonth,
                },
                {
                  label: "Team Seats",
                  get: (t: (typeof tiers)[0]) => (t.teamSeats === "unlimited" ? "∞" : t.teamSeats),
                },
                { label: "API Access", get: (t: (typeof tiers)[0]) => t.apiAccess },
                ...PRICING_MODULES.map((m) => ({
                  label: m.label,
                  get: (t: (typeof tiers)[0]) => t.modules.includes(m.id),
                })),
                {
                  label: "Lightning Scan",
                  get: (t: (typeof tiers)[0]) => t.scanModes.includes("lightning"),
                },
                {
                  label: "Standard Scan",
                  get: (t: (typeof tiers)[0]) => t.scanModes.includes("standard"),
                },
                {
                  label: "Mega Scan",
                  get: (t: (typeof tiers)[0]) => t.scanModes.includes("mega"),
                },
                {
                  label: "Super Scan",
                  get: (t: (typeof tiers)[0]) => t.scanModes.includes("super"),
                },
              ].map((row) => (
                <tr key={row.label} className="border-b border-white/5">
                  <td className="p-4 text-slate-400">{row.label}</td>
                  {tiers.map((t) => {
                    const val = row.get(t);
                    return (
                      <td key={t.id} className="p-4 text-center font-mono">
                        {typeof val === "boolean" ? (
                          val ? (
                            <Check className="w-4 h-4 text-green-400 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-slate-600 mx-auto" />
                          )
                        ) : (
                          String(val)
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

      <SiteFooter />
    </div>
  );
}
