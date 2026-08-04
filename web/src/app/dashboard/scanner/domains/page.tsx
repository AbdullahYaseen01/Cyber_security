"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Globe, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const domainSchema = z.object({
  name: z.string().min(3, "Enter a valid domain"),
});

type DomainForm = z.infer<typeof domainSchema>;

interface Domain {
  id: string;
  name: string;
  verified: boolean;
  verificationToken: string;
  securityScore: number;
  grade: string;
  lastScannedAt: string | null;
}

export default function DomainsPage() {
  const queryClient = useQueryClient();
  const [verificationInfo, setVerificationInfo] = useState<{
    domain: Domain;
    dns: { record: string; value: string };
    file: { path: string; content: string };
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["domains"],
    queryFn: () => fetch("/api/domains").then((r) => r.json()),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DomainForm>({ resolver: zodResolver(domainSchema) });

  const addDomain = useMutation({
    mutationFn: async (values: DomainForm) => {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["domains"] });
      setVerificationInfo(result);
      reset();
      toast.success("Domain added. Complete verification to start scanning.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const verifyDomain = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/domains/${id}/verify`, { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["domains"] });
      if (result.verified) {
        toast.success("Domain verified!");
        setVerificationInfo(null);
      } else {
        toast.error("Verification failed. Check your DNS or file.");
      }
    },
  });

  const domains: Domain[] = data?.domains ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Domain Management</h1>
        <p className="text-slate-400 text-sm mt-1">Add and verify domains before scanning</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Domain</CardTitle>
          <CardDescription>Enter your domain URL to begin verification</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => addDomain.mutate(v))} className="flex gap-3">
            <div className="flex-1">
              <Input {...register("name")} placeholder="example.com" />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
            </div>
            <Button type="submit" variant="glow" disabled={isSubmitting || addDomain.isPending}>
              Add Domain
            </Button>
          </form>
        </CardContent>
      </Card>

      {verificationInfo && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-amber-400">Verification Required</CardTitle>
            <CardDescription>Complete one of the following methods for {verificationInfo.domain.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 font-mono text-sm">
              <p className="text-slate-400 mb-2">DNS TXT Record</p>
              <p><span className="text-cyan-400">Host:</span> {verificationInfo.dns.record}</p>
              <p><span className="text-cyan-400">Value:</span> {verificationInfo.dns.value}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 font-mono text-sm">
              <p className="text-slate-400 mb-2">HTTP File</p>
              <p><span className="text-cyan-400">Path:</span> https://{verificationInfo.domain.name}{verificationInfo.file.path}</p>
              <p><span className="text-cyan-400">Content:</span> {verificationInfo.file.content}</p>
            </div>
            <Button
              variant="glow"
              onClick={() => verifyDomain.mutate(verificationInfo.domain.id)}
              disabled={verifyDomain.isPending}
            >
              Verify Now
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Your Domains</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div>
          ) : domains.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No domains added yet.</p>
              <p className="text-sm text-slate-500 mt-1">Add your first domain to start scanning.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-left">
                    <th className="pb-3 font-medium">Domain</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Score</th>
                    <th className="pb-3 font-medium">Grade</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((d) => (
                    <tr key={d.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 font-mono">{d.name}</td>
                      <td className="py-3">
                        {d.verified ? (
                          <span className="flex items-center gap-1 text-green-400"><CheckCircle className="w-4 h-4" /> Verified</span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-400"><Clock className="w-4 h-4" /> Pending</span>
                        )}
                      </td>
                      <td className="py-3 font-mono">{d.securityScore}</td>
                      <td className="py-3"><Badge>{d.grade}</Badge></td>
                      <td className="py-3">
                        {!d.verified && (
                          <Button size="sm" variant="secondary" onClick={() => verifyDomain.mutate(d.id)}>
                            Verify
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
