"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Zap, Crown, Building, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TIERS, type TierId } from "@/lib/tiers";
import { cn } from "@/lib/utils";

const TIER_ICONS: Record<TierId, React.ElementType> = {
  STARTER: Zap,
  PROFESSIONAL: Rocket,
  BUSINESS: Building,
  ENTERPRISE: Crown,
};

const TIER_FEATURES: Record<TierId, string[]> = {
  STARTER: ["1 domain", "10 scans/month", "Lightning scans", "Dashboard"],
  PROFESSIONAL: [
    "5 domains",
    "100 scans/month",
    "Standard scans",
    "API Security",
    "Compliance Hub",
    "Reports",
  ],
  BUSINESS: [
    "25 domains",
    "500 scans/month",
    "Mega scans",
    "All modules",
    "Agent Security",
    "Cloud Guard",
    "Phishing Shield",
    "Dark Web Intel",
  ],
  ENTERPRISE: [
    "Unlimited domains",
    "Unlimited scans",
    "Super scans",
    "All modules",
    "Priority support",
    "White-label reports",
    "Academy access",
  ],
};

export default function SubscriptionOnboardingPage() {
  const router = useRouter();
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState<TierId | null>(null);

  async function selectPlan(tier: TierId) {
    setLoading(tier);
    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, cycle: annual ? "annual" : "monthly" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Stripe checkout unavailable. Configure STRIPE_SECRET_KEY.");
        router.push("/dashboard");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Step 2 of 2</p>
          <h1 className="text-3xl font-bold">Choose Your Plan</h1>
          <p className="text-slate-400 mt-2">
            Every plan includes real security scanning. No free tier.
          </p>

          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={cn("text-sm", !annual && "text-white")}>Monthly</span>
            <button
              type="button"
              onClick={() => setAnnual(!annual)}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                annual ? "bg-cyan-500" : "bg-white/20"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                  annual ? "translate-x-7" : "translate-x-1"
                )}
              />
            </button>
            <span className={cn("text-sm", annual && "text-white")}>
              Annual <span className="text-green-400 text-xs">(20% off)</span>
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(Object.keys(TIERS) as TierId[]).map((tierId, i) => {
            const tier = TIERS[tierId];
            const Icon = TIER_ICONS[tierId];
            const price = annual
              ? Math.round(tier.annualPrice / 12)
              : tier.monthlyPrice;
            const isPopular = tierId === "BUSINESS";

            return (
              <motion.div
                key={tierId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card
                  className={cn(
                    "relative h-full border-white/10 bg-white/[0.03] backdrop-blur-xl transition-all hover:scale-[1.01]",
                    isPopular && "border-cyan-500/40 glow-cyan"
                  )}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-xs font-semibold text-black">
                      Most Popular
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5 text-cyan-400" />
                      <CardTitle className="text-lg">{tier.name}</CardTitle>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold font-mono text-white">${price}</span>
                      <span className="text-slate-400 text-sm">/mo</span>
                    </div>
                    {annual && (
                      <CardDescription>
                        Billed ${tier.annualPrice}/year
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {TIER_FEATURES[tierId].map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                          <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={isPopular ? "glow" : "secondary"}
                      className="w-full"
                      disabled={loading !== null}
                      onClick={() => selectPlan(tierId)}
                    >
                      {loading === tierId ? "Redirecting..." : `Get ${tier.name}`}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
