"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { DashboardModule } from "@/components/modules/dashboard-module";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
  title: z.string().min(3),
  type: z.enum(["EXECUTIVE_SUMMARY", "TECHNICAL_VULNERABILITY", "COMPLIANCE_STATUS", "API_SECURITY", "CLOUD_MISCONFIG", "AGENT_HEALTH", "PHISHING_RESULTS", "DARK_WEB_EXPOSURE"]),
  format: z.enum(["HTML", "PDF", "JSON"]),
});

type Form = z.infer<typeof schema>;

export default function ReportsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => fetch("/api/reports").then((r) => r.json()),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { type: "EXECUTIVE_SUMMARY", format: "HTML" },
  });

  const create = useMutation({
    mutationFn: async (values: Form) => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      reset();
      toast.success("Report generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reports = data?.reports ?? [];

  return (
    <DashboardModule moduleId="reports" title="Reports Center" description="Generate executive and technical security reports">
      <Card>
        <CardHeader><CardTitle>Generate Report</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => create.mutate(v))} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label>Title</Label>
              <Input {...register("title")} placeholder="Q1 Security Assessment" className="mt-1" />
            </div>
            <div>
              <Label>Type</Label>
              <select {...register("type")} className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm">
                {["EXECUTIVE_SUMMARY", "TECHNICAL_VULNERABILITY", "COMPLIANCE_STATUS", "API_SECURITY", "CLOUD_MISCONFIG", "AGENT_HEALTH", "PHISHING_RESULTS", "DARK_WEB_EXPOSURE"].map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="glow" disabled={isSubmitting}>Generate</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Reports ({reports.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-slate-500">Loading...</p>
          ) : reports.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No reports generated yet.</p>
          ) : (
            <div className="space-y-3">
              {reports.map((r: { id: string; title: string; type: string; format: string; status: string; createdAt: string }) => (
                <div key={r.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-slate-400">{r.type} · {r.format} · {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</p>
                  </div>
                  <Badge>{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardModule>
  );
}
