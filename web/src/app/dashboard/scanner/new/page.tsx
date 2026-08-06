"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Zap, Flame, Rocket, Sparkles, Lock, Mail, Globe2, Info, History } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { canUseScanMode, type TierId } from "@/lib/tiers";
import { isDemoUser } from "@/lib/demo-auth";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

const SCAN_MODES = [
  { id: "LIGHTNING", label: "Lightning Scan", icon: Zap, desc: "2 min · 20 checks", tier: "FREE" as TierId },
  { id: "STANDARD", label: "Standard Scan", icon: Flame, desc: "13-phase · ~30 min", tier: "PROFESSIONAL" as TierId },
  { id: "MEGA", label: "Mega Scan", icon: Rocket, desc: "Extended path + API surface fuzz", tier: "BUSINESS" as TierId },
  { id: "SUPER", label: "Super Scan", icon: Sparkles, desc: "Alternative deep scan", tier: "ENTERPRISE" as TierId },
];

const scanSchema = z.object({
  domain: z
    .string()
    .min(3, "Enter a domain")
    .regex(/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/, "Enter a valid domain (e.g. example.com)"),
  email: z
    .string()
    .optional()
    .refine((v) => !v || v.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email"),
  mode: z.enum(["LIGHTNING", "STANDARD", "MEGA", "SUPER"]),
});

type ScanForm = z.infer<typeof scanSchema>;

export default function NewScanPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tier = user?.tier ?? "STARTER";
  const isDemo = isDemoUser(user);

  const { data: historyData } = useQuery({
    queryKey: ["scans", "mine"],
    queryFn: () => fetch("/api/scans?mine=1").then((r) => r.json()),
    refetchOnMount: true,
  });
  const myScans = historyData?.scans ?? [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ScanForm>({
    resolver: zodResolver(scanSchema),
    defaultValues: {
      mode: "LIGHTNING",
      email: "",
      domain: "",
    },
  });

  const selectedMode = watch("mode");

  const startScan = useMutation({
    mutationFn: async (values: ScanForm) => {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: values.domain.trim(),
          email: values.email?.trim() || undefined,
          mode: values.mode,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to start scan");
      return result;
    },
    onSuccess: (result) => {
      toast.success(
        result.reportEmail
          ? "Scan started — report will be emailed when it finishes"
          : "Scan started — track it in your history"
      );
      router.push(`/dashboard/scanner/scan/${result.scanId}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-5 max-w-3xl animate-rise">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Deep Scanner</p>
          <h1 className="text-2xl font-bold mt-1">New scan</h1>
          <p className="text-muted text-sm mt-1">
            Enter any domain — no verification required. Email report is optional.
          </p>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link href="/dashboard/scanner/history">
            <History className="w-3.5 h-3.5" />
            My history
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit((v) => startScan.mutate(v))} className="space-y-4">
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-cyan-300" />
              Target domain
            </CardTitle>
            <CardDescription>Type any website or hostname.</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              {...register("domain")}
              placeholder="example.com or https://app.example.com"
              className="mt-1.5"
              autoFocus
              autoComplete="url"
            />
            {errors.domain && <p className="text-xs text-rose-400 mt-1.5">{errors.domain.message}</p>}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Scan mode</CardTitle>
            <CardDescription>Select the depth of your security assessment</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SCAN_MODES.map((m) => {
              const locked = !canUseScanMode(tier, m.tier, { isDemo });
              const selected = selectedMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={locked}
                  onClick={() => setValue("mode", m.id as ScanForm["mode"])}
                  className={cn(
                    "p-3.5 rounded-xl border text-left transition-colors backdrop-blur-md",
                    selected
                      ? "border-cyan-400/50 bg-cyan-400/10 ring-1 ring-cyan-400/30"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20",
                    locked && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {locked ? (
                      <Lock className="w-4 h-4 text-slate-500" />
                    ) : (
                      <m.icon className="w-4 h-4 text-cyan-300" />
                    )}
                    <span className="font-semibold text-sm">{m.label}</span>
                  </div>
                  <p className="text-xs text-muted">{m.desc}</p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4 text-cyan-300" />
              Report email <span className="chip">Optional</span>
            </CardTitle>
            <CardDescription>Leave blank to skip email — results stay in your history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="you@company.com"
                className="mt-1.5"
                autoComplete="email"
              />
              {errors.email && <p className="text-xs text-rose-400 mt-1.5">{errors.email.message}</p>}
            </div>
            <div className="flex gap-2.5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2.5 text-[13px] text-cyan-100">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-cyan-300" />
              <p>
                If you provide an email, a report will also be sent to your email shortly after the scan completes.
              </p>
            </div>
          </CardContent>
        </Card>

        <input type="hidden" {...register("mode")} />

        <Button
          type="submit"
          variant="glow"
          size="lg"
          className="w-full"
          disabled={isSubmitting || startScan.isPending}
        >
          {startScan.isPending ? "Starting scan…" : "Start scan"}
        </Button>
      </form>

      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your scan history</CardTitle>
          <CardDescription>All scans you have run on this account</CardDescription>
        </CardHeader>
        <CardContent>
          {myScans.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">No scans yet — start your first one above.</p>
          ) : (
            <div className="space-y-2">
              {myScans.slice(0, 8).map((s: {
                id: string;
                domain: { name: string };
                mode: string;
                status: string;
                findingsCount: number;
                createdAt: string;
                completedAt: string | null;
              }) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.03]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm truncate">{s.domain?.name}</p>
                    <p className="text-[11px] text-muted mt-0.5">
                      {s.mode} · {s.findingsCount} findings ·{" "}
                      {formatDistanceToNow(new Date(s.completedAt ?? s.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge>{s.status}</Badge>
                  <Button size="sm" variant="secondary" asChild>
                    <Link href={`/dashboard/scanner/findings?scanId=${s.id}`}>Findings</Link>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/dashboard/scanner/scan/${s.id}`}>Open</Link>
                  </Button>
                </div>
              ))}
              {myScans.length > 8 && (
                <Button variant="secondary" className="w-full" asChild>
                  <Link href="/dashboard/scanner/history">View all {myScans.length} scans</Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
