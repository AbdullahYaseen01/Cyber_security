import { cn } from "@/lib/utils";

const severityStyles = {
  CRITICAL: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  HIGH: "bg-orange-500/15 text-orange-300 border-orange-400/30",
  MEDIUM: "bg-amber-500/15 text-amber-200 border-amber-400/30",
  LOW: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  INFO: "bg-slate-500/15 text-slate-300 border-slate-400/30",
} as const;

export type Severity = keyof typeof severityStyles;

export function Badge({
  children,
  severity,
  className,
}: {
  children: React.ReactNode;
  severity?: Severity;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium uppercase tracking-wider",
        severity ? severityStyles[severity] : "bg-white/5 text-slate-300 border-white/10",
        className
      )}
    >
      {children}
    </span>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    FREE: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10",
    STARTER: "text-cyan-300 border-cyan-400/30 bg-cyan-400/10",
    PROFESSIONAL: "text-violet-300 border-violet-400/30 bg-violet-400/10",
    BUSINESS: "text-amber-200 border-amber-400/30 bg-amber-400/10",
    ENTERPRISE: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10",
  };
  return (
    <span className={cn("text-[10px] font-mono border rounded px-1.5 py-0.5", colors[tier] ?? colors.STARTER)}>
      {tier}
    </span>
  );
}

export function LockBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
          clipRule="evenodd"
        />
      </svg>
      Upgrade
    </span>
  );
}
