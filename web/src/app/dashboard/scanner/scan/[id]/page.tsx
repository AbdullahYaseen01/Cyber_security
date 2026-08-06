"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Square, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HolographicProgress, PhaseList } from "@/components/scanner/holographic-progress";
import { ThreatFeed } from "@/components/scanner/threat-feed";
import { SCAN_PHASES } from "@/lib/scan-phases";
import { supabase } from "@/lib/supabase";
import { formatDuration } from "@/lib/utils";

interface Finding {
  id: string;
  title: string;
  severity: string;
  url: string;
  parameter?: string;
  confidence: number;
  createdAt: string;
}

export default function ActiveScanPage() {
  const { id } = useParams<{ id: string }>();
  const [elapsed, setElapsed] = useState(0);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [filter, setFilter] = useState<"ALL" | "CRITICAL" | "HIGH">("ALL");

  const { data, refetch } = useQuery({
    queryKey: ["scan", id],
    queryFn: () => fetch(`/api/scans/${id}`).then((r) => r.json()),
    refetchInterval: (query) => {
      const status = query.state.data?.scan?.status;
      return status === "RUNNING" || status === "PENDING" ? 2000 : false;
    },
  });

  const scan = data?.scan;

  useEffect(() => {
    if (scan?.findings) {
      setFindings(scan.findings);
    }
  }, [scan?.findings]);

  useEffect(() => {
    if (!scan?.startedAt) return;
    const start = new Date(scan.startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [scan?.startedAt]);

  useEffect(() => {
    if (!supabase || !id) return;
    const channel = supabase.channel(`scan_${id}`);
    channel
      .on("broadcast", { event: "finding" }, ({ payload }) => {
        const finding = (payload as { finding: Finding }).finding;
        if (finding) setFindings((prev) => [finding, ...prev]);
      })
      .on("broadcast", { event: "complete" }, () => refetch())
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [id, refetch]);

  const stopScan = useMutation({
    mutationFn: () => fetch(`/api/scans/${id}/stop`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Scan stopped");
      refetch();
    },
  });

  const filteredFindings = findings.filter((f) => {
    if (filter === "ALL") return true;
    return f.severity === filter;
  });

  const threats = filteredFindings.map((f) => ({
    id: f.id,
    title: f.title,
    severity: f.severity as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO",
    url: f.url,
    parameter: f.parameter,
    confidence: f.confidence,
    timestamp: f.createdAt,
  }));

  const isComplete = scan?.status === "COMPLETED" || scan?.status === "STOPPED";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/scanner"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold font-mono">{scan?.domain?.name ?? "Scanning..."}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge>{scan?.mode}</Badge>
              <span className="text-sm text-slate-400 font-mono">{formatDuration(elapsed)}</span>
              <Badge severity={scan?.status === "RUNNING" ? "MEDIUM" : "INFO"}>{scan?.status}</Badge>
            </div>
          </div>
        </div>
        {scan?.status === "RUNNING" && (
          <Button variant="destructive" size="sm" onClick={() => stopScan.mutate()} disabled={stopScan.isPending}>
            <Square className="w-4 h-4 mr-1" /> Stop Scan
          </Button>
        )}
        {isComplete && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/dashboard/scanner/history">History</Link>
            </Button>
            <Button variant="glow" size="sm" asChild>
              <Link href={`/dashboard/scanner/findings?scanId=${id}`}>View findings</Link>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <HolographicProgress
            progress={scan?.progress ?? 0}
            phase={scan?.currentPhase ?? "Initializing..."}
            phaseNumber={Math.ceil(((scan?.progress ?? 0) / 100) * (scan?.totalPhases ?? 13))}
            totalPhases={scan?.totalPhases ?? 13}
            fuzzProgress={scan?.fuzzProgress ?? 0}
            fuzzTotal={scan?.fuzzTotal ?? 1_000_000}
          />
          <PhaseList
            phases={SCAN_PHASES.slice(0, scan?.totalPhases ?? 13).map((p) => p.label)}
            currentPhase={Math.ceil(((scan?.progress ?? 0) / 100) * (scan?.totalPhases ?? 13))}
          />
        </div>

        <div className="lg:col-span-3">
          <div className="flex gap-2 mb-3">
            {(["ALL", "CRITICAL", "HIGH"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filter === f ? "bg-cyan-500/20 text-cyan-300" : "bg-white/5 text-slate-400"
                }`}
              >
                {f} {f !== "ALL" && `(${findings.filter((x) => x.severity === f).length})`}
              </button>
            ))}
          </div>
          <ThreatFeed events={threats} />
        </div>
      </div>

      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total", value: scan?.findingsCount ?? 0, color: "text-white" },
              { label: "Critical", value: scan?.criticalCount ?? 0, color: "text-red-400" },
              { label: "High", value: scan?.highCount ?? 0, color: "text-orange-400" },
              { label: "Medium", value: scan?.mediumCount ?? 0, color: "text-amber-400" },
              { label: "Low", value: scan?.lowCount ?? 0, color: "text-cyan-400" },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-xl bg-white/5 border border-white/10 text-center backdrop-blur-md">
                <p className="text-xs text-slate-400">{s.label}</p>
                <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">Findings from this scan</p>
              <Button size="sm" variant="glow" asChild>
                <Link href={`/dashboard/scanner/findings?scanId=${id}`}>Open full list</Link>
              </Button>
            </div>
            {findings.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                No findings recorded for this scan yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {findings.slice(0, 25).map((f) => (
                  <div key={f.id} className="p-3 rounded-xl border border-white/10 bg-white/[0.03]">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        severity={
                          (["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].includes(f.severity)
                            ? f.severity
                            : "INFO") as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"
                        }
                      >
                        {f.severity}
                      </Badge>
                      <span className="text-sm font-medium truncate">{f.title}</span>
                    </div>
                    <p className="text-xs font-mono text-cyan-300/80 truncate">{f.url}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
