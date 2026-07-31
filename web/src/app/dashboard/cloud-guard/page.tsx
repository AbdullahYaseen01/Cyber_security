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
  provider: z.enum(["AWS", "AZURE", "GCP"]),
  name: z.string().min(2),
  accountId: z.string().min(3),
});

type Form = z.infer<typeof schema>;

export default function CloudGuardPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["cloud-accounts"],
    queryFn: () => fetch("/api/cloud-accounts").then((r) => r.json()),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { provider: "AWS" },
  });

  const create = useMutation({
    mutationFn: async (values: Form) => {
      const res = await fetch("/api/cloud-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cloud-accounts"] });
      reset();
      toast.success("Cloud account connected");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const accounts = data?.accounts ?? [];

  return (
    <DashboardModule moduleId="cloud" title="Cloud Guard" description="Multi-cloud misconfiguration and compliance scanning">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: "Connected Accounts", value: accounts.length },
          { label: "Misconfigurations", value: accounts.reduce((s: number, a: { misconfigCount: number }) => s + a.misconfigCount, 0) },
          { label: "Providers", value: new Set(accounts.map((a: { provider: string }) => a.provider)).size },
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
        <CardHeader><CardTitle>Connect Cloud Account</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => create.mutate(v))} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Provider</Label>
              <select {...register("provider")} className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm">
                <option value="AWS">AWS</option>
                <option value="AZURE">Azure</option>
                <option value="GCP">GCP</option>
              </select>
            </div>
            <div>
              <Label>Account Name</Label>
              <Input {...register("name")} placeholder="Production AWS" className="mt-1" />
            </div>
            <div>
              <Label>Account ID</Label>
              <Input {...register("accountId")} placeholder="123456789012" className="mt-1" />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="glow" disabled={isSubmitting}>Connect</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Connected Accounts</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-slate-500">Loading...</p>
          ) : accounts.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No cloud accounts connected yet.</p>
          ) : (
            <div className="space-y-3">
              {accounts.map((a: { id: string; provider: string; name: string; accountId: string; status: string; misconfigCount: number }) => (
                <div key={a.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{a.provider} · {a.accountId}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge>{a.status}</Badge>
                    <span className="text-sm font-mono text-amber-400">{a.misconfigCount} issues</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardModule>
  );
}
