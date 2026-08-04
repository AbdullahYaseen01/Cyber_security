"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Play, Terminal } from "lucide-react";
import { DashboardModule } from "@/components/modules/dashboard-module";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
  name: z.string().min(2),
  os: z.enum(["Linux", "Windows", "macOS", "Docker", "Kubernetes"]),
  agentType: z.enum(["monitor", "responder", "hunter", "compliance"]),
  targetUrl: z.string().optional(),
});

type Form = z.infer<typeof schema>;

export default function AgentSecurityPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => fetch("/api/agents").then((r) => r.json()),
    refetchInterval: 20_000,
  });

  const { data: logsData } = useQuery({
    queryKey: ["agent-logs", selectedId],
    queryFn: () => fetch(`/api/agents/${selectedId}/logs`).then((r) => r.json()),
    enabled: !!selectedId,
    refetchInterval: selectedId ? 5_000 : false,
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { os: "Linux", agentType: "monitor", targetUrl: "https://demo.quantumshield.io" },
  });

  const create = useMutation({
    mutationFn: async (values: Form) => {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      reset({ os: "Linux", agentType: "monitor", name: "", targetUrl: "https://demo.quantumshield.io" });
      toast.success("Agent deployed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const run = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/agents/${id}/run`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["agent-logs", id] });
      setSelectedId(id);
      toast.success("Agent run complete");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const agents = data?.agents ?? [];
  const logs = logsData?.logs ?? [];

  return (
    <DashboardModule moduleId="agents" title="Agent Security" description="Monitor agents with live HTTP/TLS checks and terminal logs">
      <Card>
        <CardHeader><CardTitle>Deploy agent</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => create.mutate(v))} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <Label>Name</Label>
              <Input {...register("name")} placeholder="prod-monitor-01" className="mt-1" />
            </div>
            <div>
              <Label>Type</Label>
              <select {...register("agentType")} className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm">
                {["monitor", "responder", "hunter", "compliance"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>OS</Label>
              <select {...register("os")} className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm">
                {["Linux", "Windows", "macOS", "Docker", "Kubernetes"].map((os) => (
                  <option key={os} value={os}>{os}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Target URL</Label>
              <Input {...register("targetUrl")} placeholder="https://example.com" className="mt-1" />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="glow" className="w-full" disabled={isSubmitting}>Deploy</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Agents</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="h-24 animate-pulse bg-white/5 rounded-xl" />
            ) : agents.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No agents. Deploy a monitor to start.</p>
            ) : (
              agents.map((a: {
                id: string;
                name: string;
                agentType: string;
                status: string;
                targetUrl?: string;
                lastRunAt?: string;
              }) => (
                <div
                  key={a.id}
                  className={`p-3 rounded-xl border bg-white/[0.03] flex items-center justify-between gap-2 cursor-pointer ${
                    selectedId === a.id ? "border-cyan-500/40" : "border-white/10"
                  }`}
                  onClick={() => setSelectedId(a.id)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {a.agentType} · {a.targetUrl || "no target"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge>{a.status}</Badge>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        run.mutate(a.id);
                      }}
                      disabled={run.isPending}
                    >
                      <Play className="w-3.5 h-3.5" />
                      Run
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Live logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-black/50 border border-white/10 p-3 font-mono text-xs h-72 overflow-y-auto space-y-1">
              {!selectedId ? (
                <p className="text-slate-600">Select an agent or click Run.</p>
              ) : logs.length === 0 ? (
                <p className="text-slate-600">No logs yet. Click Run.</p>
              ) : (
                logs.map((l: { id: string; level: string; message: string; createdAt: string }) => (
                  <div key={l.id} className="flex gap-2">
                    <span className="text-slate-600 shrink-0">
                      {new Date(l.createdAt).toLocaleTimeString()}
                    </span>
                    <span
                      className={
                        l.level === "error"
                          ? "text-red-400"
                          : l.level === "warn"
                            ? "text-amber-400"
                            : "text-green-400"
                      }
                    >
                      [{l.level}]
                    </span>
                    <span className="text-slate-300">{l.message}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardModule>
  );
}
