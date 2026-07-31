"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardModule } from "@/components/modules/dashboard-module";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FRAMEWORKS = ["ISO27001", "SOC2", "GDPR"];

export default function CompliancePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-tasks"],
    queryFn: () => fetch("/api/compliance/tasks").then((r) => r.json()),
  });

  const activate = useMutation({
    mutationFn: async (framework: string) => {
      const res = await fetch("/api/compliance/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ framework }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance-tasks"] });
      toast.success("Framework activated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tasks = data?.tasks ?? [];

  return (
    <DashboardModule moduleId="compliance" title="Compliance Hub" description="Framework mapping, task management, and gap analysis">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FRAMEWORKS.map((fw) => {
          const fwTasks = tasks.filter((t: { framework: string }) => t.framework === fw);
          const complete = fwTasks.filter((t: { status: string }) => t.status === "COMPLETE").length;
          const pct = fwTasks.length ? Math.round((complete / fwTasks.length) * 100) : 0;
          return (
            <Card key={fw}>
              <CardContent className="pt-6">
                <p className="font-semibold">{fw}</p>
                <p className="text-3xl font-mono text-cyan-400 mt-2">{pct}%</p>
                <p className="text-xs text-slate-400 mt-1">{fwTasks.length} controls</p>
                {fwTasks.length === 0 && (
                  <Button size="sm" variant="secondary" className="mt-3" onClick={() => activate.mutate(fw)}>
                    Activate
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Compliance Tasks</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-slate-500">Loading...</p>
          ) : tasks.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Activate a framework above to get started.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((t: { id: string; framework: string; controlId: string; controlName: string; status: string }) => (
                <div key={t.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t.controlId} — {t.controlName}</p>
                    <p className="text-xs text-slate-400">{t.framework}</p>
                  </div>
                  <Badge>{t.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardModule>
  );
}
