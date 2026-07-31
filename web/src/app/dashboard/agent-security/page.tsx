"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { DashboardModule } from "@/components/modules/dashboard-module";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
  name: z.string().min(3),
  os: z.enum(["Linux", "Windows", "macOS", "Docker", "Kubernetes"]),
});

type Form = z.infer<typeof schema>;

export default function AgentSecurityPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => fetch("/api/agents").then((r) => r.json()),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { os: "Linux" },
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
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      reset();
      toast.success(`Agent created. Install token: ${result.agent.installToken}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const agents = data?.agents ?? [];

  return (
    <DashboardModule moduleId="agents" title="Agent Security" description="Endpoint and workload continuous monitoring">
      <Card>
        <CardHeader><CardTitle>Deploy New Agent</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => create.mutate(v))} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Agent Name</Label>
              <Input {...register("name")} placeholder="prod-web-01" className="mt-1" />
            </div>
            <div>
              <Label>OS</Label>
              <select {...register("os")} className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm">
                {["Linux", "Windows", "macOS", "Docker", "Kubernetes"].map((os) => (
                  <option key={os} value={os}>{os}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="glow" disabled={isSubmitting}>Create Agent</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Agents ({agents.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-slate-500">Loading...</p>
          ) : agents.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No agents deployed yet.</p>
          ) : (
            <div className="space-y-3">
              {agents.map((a: { id: string; name: string; os: string; status: string; hostname: string; installToken: string }) => (
                <div key={a.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{a.name}</p>
                    <Badge severity={a.status === "ONLINE" ? "INFO" : "MEDIUM"}>{a.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-400">{a.os} · {a.hostname}</p>
                  <p className="text-xs font-mono text-cyan-500/60 mt-1">Token: {a.installToken}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardModule>
  );
}
