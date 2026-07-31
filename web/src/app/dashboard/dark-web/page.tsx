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
  emails: z.string().min(3),
  keywords: z.string().min(1),
});

type Form = z.infer<typeof schema>;

export default function DarkWebPage() {
  const qc = useQueryClient();
  const { data: alertsData, isLoading } = useQuery({
    queryKey: ["dark-web-alerts"],
    queryFn: () => fetch("/api/dark-web/alerts").then((r) => r.json()),
  });
  const { data: configData } = useQuery({
    queryKey: ["dark-web-config"],
    queryFn: () => fetch("/api/dark-web/config").then((r) => r.json()),
  });

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      emails: (configData?.config?.monitoredEmails as string[] | undefined)?.join(", ") ?? "",
      keywords: (configData?.config?.keywords as string[] | undefined)?.join(", ") ?? "",
    },
  });

  const save = useMutation({
    mutationFn: async (values: Form) => {
      const res = await fetch("/api/dark-web/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monitoredEmails: values.emails.split(",").map((e) => e.trim()),
          keywords: values.keywords.split(",").map((k) => k.trim()),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dark-web-config"] });
      toast.success("Monitor configuration saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alerts = alertsData?.alerts ?? [];

  return (
    <DashboardModule moduleId="darkweb" title="Dark Web Intel" description="Monitor credential leaks, breaches, and brand mentions">
      <Card>
        <CardHeader><CardTitle>Monitor Configuration</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
            <div>
              <Label>Monitored Emails</Label>
              <Input {...register("emails")} placeholder="admin@company.com, security@company.com" className="mt-1" />
            </div>
            <div>
              <Label>Keywords</Label>
              <Input {...register("keywords")} placeholder="company name, product name" className="mt-1" />
            </div>
            <Button type="submit" variant="glow" disabled={isSubmitting}>Save Monitor</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Alerts ({alerts.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-slate-500">Loading...</p>
          ) : alerts.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No dark web alerts detected.</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((a: { id: string; type: string; severity: string; title: string; status: string; createdAt: string }) => (
                <div key={a.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge severity={a.severity as "CRITICAL" | "HIGH" | "MEDIUM"}>{a.severity}</Badge>
                    <Badge>{a.type}</Badge>
                    <span className="text-xs text-slate-500 ml-auto">
                      {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="font-medium">{a.title}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardModule>
  );
}
