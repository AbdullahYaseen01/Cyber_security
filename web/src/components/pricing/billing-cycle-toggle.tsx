"use client";

import { cn } from "@/lib/utils";
import type { BillingCycle } from "@/lib/tiers";

const CYCLES: { id: BillingCycle; label: string; badge?: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly", badge: "10% off" },
  { id: "annual", label: "Annual", badge: "20% off" },
];

export function BillingCycleToggle({
  value,
  onChange,
  className,
}: {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10",
        className
      )}
    >
      {CYCLES.map((cycle) => (
        <button
          key={cycle.id}
          type="button"
          onClick={() => onChange(cycle.id)}
          className={cn(
            "relative px-4 py-2 rounded-lg text-sm transition-all",
            value === cycle.id ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-white"
          )}
        >
          {cycle.label}
          {cycle.badge && (
            <span
              className={cn(
                "ml-1.5 text-[10px] font-medium",
                value === cycle.id ? "text-green-400" : "text-slate-500"
              )}
            >
              {cycle.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
