"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Zap, Flame, Rocket, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { canUseScanMode, type TierId } from "@/lib/tiers";
import { isDemoUser } from "@/lib/demo-auth";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

const SCAN_MODES = [
  { id: "LIGHTNING", label: "Lightning Scan", icon: Zap, desc: "2 min · 20 checks", tier: "STARTER" as TierId },
  { id: "STANDARD", label: "Standard Scan", icon: Flame, desc: "13-phase · ~30 min", tier: "PROFESSIONAL" as TierId },
  { id: "MEGA", label: "Mega Scan", icon: Rocket, desc: "1M+ fuzz · 150 workers", tier: "BUSINESS" as TierId },
  { id: "SUPER", label: "Super Scan", icon: Sparkles, desc: "Alternative deep scan", tier: "ENTERPRISE" as TierId },
];

const scanSchema = z.object({
  domainId: z.string().min(1, "Select a domain"),
  mode: z.enum(["LIGHTNING", "STANDARD", "MEGA", "SUPER"]),
});

type ScanForm = z.infer<typeof scanSchema>;

export default function NewScanPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tier = user?.tier ?? "STARTER";
  const isDemo = isDemoUser(user);

  const { data: domainsData, isLoading } = useQuery({
    queryKey: ["domains"],
    queryFn: () => fetch("/api/domains").then((r) => r.json()),
  });

  const verifiedDomains = (domainsData?.domains ?? []).filter(
    (d: { verified: boolean }) => d.verified
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ScanForm>({
    resolver: zodResolver(scanSchema),
    defaultValues: { mode: "LIGHTNING" },
  });

  const selectedMode = watch("mode");

  const startScan = useMutation({
    mutationFn: async (values: ScanForm) => {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: (result) => {
      toast.success("Scan started!");
      router.push(`/dashboard/scanner/scan/${result.scanId}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">New Scan</h1>
        <p className="text-slate-400 text-sm mt-1">Configure and launch a security assessment</p>
      </div>

      {verifiedDomains.length === 0 && !isLoading && (
        <Card className="border-amber-500/30">
          <CardContent className="pt-6">
            <p className="text-amber-400">No verified domains. Add and verify a domain first.</p>
            <Button variant="glow" className="mt-3" asChild>
              <Link href="/dashboard/scanner/domains">Manage Domains</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit((v) => startScan.mutate(v))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Target Domain</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="domainId">Verified Domain</Label>
            <select
              id="domainId"
              {...register("domainId")}
              className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm"
            >
              <option value="">Select domain...</option>
              {verifiedDomains.map((d: { id: string; name: string }) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {errors.domainId && <p className="text-xs text-red-400 mt-1">{errors.domainId.message}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scan Mode</CardTitle>
            <CardDescription>Select the depth of your security assessment</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    "p-4 rounded-xl border text-left transition-all",
                    selected ? "border-cyan-500/50 bg-cyan-500/10" : "border-white/10 bg-white/5",
                    locked && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {locked ? <Lock className="w-4 h-4 text-slate-500" /> : <m.icon className="w-4 h-4 text-cyan-400" />}
                    <span className="font-semibold text-sm">{m.label}</span>
                  </div>
                  <p className="text-xs text-slate-400">{m.desc}</p>
                  {locked && (
                    <Link href="/dashboard/settings/billing" className="text-xs text-purple-400 mt-2 block">
                      Upgrade to {m.tier}
                    </Link>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <input type="hidden" {...register("mode")} />

        <Button
          type="submit"
          variant="glow"
          size="lg"
          className="w-full"
          disabled={isSubmitting || startScan.isPending || verifiedDomains.length === 0}
        >
          {startScan.isPending ? "Starting..." : "Start Scan"}
        </Button>
      </form>
    </motion.div>
  );
}
