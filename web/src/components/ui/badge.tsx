import { cn } from "@/lib/utils";

const severityStyles = {
  CRITICAL: "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  MEDIUM: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  LOW: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  INFO: "bg-slate-500/20 text-slate-400 border-slate-500/40",
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
        severity ? severityStyles[severity] : "bg-white/10 text-slate-300 border-white/10",
        className
      )}
    >
      {children}
    </span>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    STARTER: "text-cyan-400 border-cyan-500/30",
    PROFESSIONAL: "text-purple-400 border-purple-500/30",
    BUSINESS: "text-amber-400 border-amber-500/30",
    ENTERPRISE: "text-green-400 border-green-500/30",
  };
  return (
    <span className={cn("text-xs font-mono border rounded px-2 py-0.5", colors[tier] ?? colors.STARTER)}>
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
