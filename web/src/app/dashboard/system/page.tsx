"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Probe = {
  serviceName?: string;
  name?: string;
  status: string;
  responseMs: number | null;
  details?: Record<string, unknown>;
  createdAt?: string;
};

function StatusIcon({ status }: { status: string }) {
  if (status === "healthy") return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === "degraded") return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  return <XCircle className="w-4 h-4 text-red-400" />;
}

export default function SystemTesterPage() {
  const qc = useQueryClient();

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["system-test"],
    queryFn: () => fetch("/api/system/test").then((r) => r.json()),
    refetchInterval: 15_000,
  });

  const run = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/system/test", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["system-test"] }),
  });

  const latest: Probe[] = data?.latest ?? [];
  const history: Probe[] = data?.history ?? [];
  const overall =
    latest.some((s) => s.status === "down")
      ? "down"
      : latest.some((s) => s.status === "degraded")
        ? "degraded"
        : latest.length
          ? "healthy"
          : "unknown";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl font-bold">System Tester</h1>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-xs text-slate-500">Live · 15s poll</span>
          </div>
          <p className="text-sm text-slate-400">
            Continuous probes: database, auth, Supabase API, scans, agents, findings.
          </p>
        </div>
        <Button
          variant="glow"
          size="sm"
          onClick={() => run.mutate()}
          disabled={run.isPending}
        >
          <RefreshCw className={cn("w-4 h-4", run.isPending && "animate-spin")} />
          Run now
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Overall</p>
            <p
              className={cn(
                "text-2xl font-mono font-bold mt-1 capitalize",
                overall === "healthy" && "text-green-400",
                overall === "degraded" && "text-amber-400",
                overall === "down" && "text-red-400"
              )}
            >
              {overall}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Services</p>
            <p className="text-2xl font-mono font-bold mt-1 text-cyan-400">{latest.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider">History rows</p>
            <p className="text-2xl font-mono font-bold mt-1">{history.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Last refresh</p>
            <p className="text-sm font-mono mt-2 text-slate-300">
              {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service status</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 animate-pulse bg-white/5 rounded-xl" />
          ) : latest.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-slate-500 mb-3">No probes yet. Run the first system test.</p>
              <Button variant="secondary" size="sm" onClick={() => run.mutate()}>
                Start continuous testing
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {latest.map((s) => (
                <div
                  key={s.serviceName || s.name}
                  className="p-4 rounded-xl border border-white/10 bg-white/[0.03]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={s.status} />
                      <span className="text-sm font-medium">{s.serviceName || s.name}</span>
                    </div>
                    <Badge
                      className={cn(
                        s.status === "healthy" && "bg-green-500/20 text-green-300",
                        s.status === "degraded" && "bg-amber-500/20 text-amber-300",
                        s.status === "down" && "bg-red-500/20 text-red-300"
                      )}
                    >
                      {s.status}
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-slate-500">
                    {s.responseMs != null ? `${s.responseMs} ms` : "—"}
                    {s.createdAt ? ` · ${new Date(s.createdAt).toLocaleTimeString()}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live event stream</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-black/40 border border-white/10 p-4 font-mono text-xs max-h-80 overflow-y-auto space-y-1">
            {history.length === 0 ? (
              <p className="text-slate-600">Waiting for probes…</p>
            ) : (
              history.slice(0, 60).map((row) => (
                <div key={`${row.serviceName}-${row.createdAt}`} className="flex gap-3 text-slate-400">
                  <span className="text-slate-600 shrink-0">
                    {row.createdAt ? new Date(row.createdAt).toLocaleTimeString() : ""}
                  </span>
                  <span
                    className={cn(
                      "w-16 shrink-0",
                      row.status === "healthy" && "text-green-400",
                      row.status === "degraded" && "text-amber-400",
                      row.status === "down" && "text-red-400"
                    )}
                  >
                    {row.status}
                  </span>
                  <span className="text-cyan-400/80">{row.serviceName}</span>
                  <span>{row.responseMs != null ? `${row.responseMs}ms` : ""}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
