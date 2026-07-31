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

const schema = z.object({
  domainId: z.string().min(1),
  path: z.string().min(1),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  authType: z.string().optional(),
});

type Form = z.infer<typeof schema>;

export default function ApiSecurityPage() {
  const qc = useQueryClient();
  const { data: domainsData } = useQuery({
    queryKey: ["domains"],
    queryFn: () => fetch("/api/domains").then((r) => r.json()),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["api-endpoints"],
    queryFn: () => fetch("/api/api-security/endpoints").then((r) => r.json()),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { method: "GET", authType: "none" },
  });

  const create = useMutation({
    mutationFn: async (values: Form) => {
      const res = await fetch("/api/api-security/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-endpoints"] });
      reset();
      toast.success("Endpoint added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const endpoints = data?.endpoints ?? [];
  const domains = domainsData?.domains ?? [];

  return (
    <DashboardModule moduleId="api" title="API Security" description="Discover, inventory, and security-test all API endpoints">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Endpoints", value: endpoints.length },
          { label: "High Risk", value: endpoints.filter((e: { riskScore: number }) => e.riskScore >= 70).length },
          { label: "Avg Risk Score", value: endpoints.length ? Math.round(endpoints.reduce((s: number, e: { riskScore: number }) => s + e.riskScore, 0) / endpoints.length) : 0 },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-xs text-slate-400 uppercase">{s.label}</p>
              <p className="text-3xl font-mono text-cyan-400 mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Add API Endpoint</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => create.mutate(v))} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Domain</Label>
              <select {...register("domainId")} className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm">
                <option value="">Select...</option>
                {domains.map((d: { id: string; name: string }) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Method</Label>
              <select {...register("method")} className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm">
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Path</Label>
              <Input {...register("path")} placeholder="/api/v1/users" className="mt-1" />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="glow" disabled={isSubmitting}>Add</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Endpoint Inventory</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-slate-500">Loading...</p>
          ) : endpoints.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No endpoints discovered. Add your first endpoint above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-left">
                    <th className="pb-3">Method</th>
                    <th className="pb-3">Path</th>
                    <th className="pb-3">Auth</th>
                    <th className="pb-3">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map((e: { id: string; method: string; path: string; authType: string; riskScore: number }) => (
                    <tr key={e.id} className="border-b border-white/5">
                      <td className="py-3 font-mono text-cyan-400">{e.method}</td>
                      <td className="py-3 font-mono">{e.path}</td>
                      <td className="py-3">{e.authType ?? "none"}</td>
                      <td className="py-3 font-mono text-amber-400">{e.riskScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardModule>
  );
}
