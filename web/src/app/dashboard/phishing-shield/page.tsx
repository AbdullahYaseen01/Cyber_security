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
  template: z.string().min(1),
  emails: z.string().min(3),
});

type Form = z.infer<typeof schema>;

export default function PhishingShieldPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["phishing-campaigns"],
    queryFn: () => fetch("/api/phishing-campaigns").then((r) => r.json()),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { template: "Office 365" },
  });

  const create = useMutation({
    mutationFn: async (values: Form) => {
      const targets = values.emails.split(",").map((e) => ({ email: e.trim() }));
      const res = await fetch("/api/phishing-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name, template: values.template, targets }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phishing-campaigns"] });
      reset();
      toast.success("Campaign created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const campaigns = data?.campaigns ?? [];

  return (
    <DashboardModule moduleId="phishing" title="Phishing Shield" description="Security awareness training and phishing simulations">
      <Card>
        <CardHeader><CardTitle>New Campaign</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Campaign Name</Label>
                <Input {...register("name")} placeholder="Q1 Security Training" className="mt-1" />
              </div>
              <div>
                <Label>Template</Label>
                <select {...register("template")} className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm">
                  {["Office 365", "Google Workspace", "Slack", "LinkedIn", "UPS", "Custom"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label>Target Emails (comma-separated)</Label>
              <Input {...register("emails")} placeholder="user1@company.com, user2@company.com" className="mt-1" />
            </div>
            <Button type="submit" variant="glow" disabled={isSubmitting}>Create Campaign</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Campaigns</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-slate-500">Loading...</p>
          ) : campaigns.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No campaigns yet.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c: { id: string; name: string; template: string; status: string; targetCount: number; clickCount: number }) => (
                <div key={c.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.template} · {c.targetCount} targets</p>
                  </div>
                  <Badge>{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardModule>
  );
}
