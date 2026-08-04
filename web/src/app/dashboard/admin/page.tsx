"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users, Building2, Activity, ScanSearch, AlertTriangle,
  RefreshCw, Shield, Wifi,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function AdminMonitorPage() {
  const qc = useQueryClient();

  const { data, isLoading, error, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ["admin-monitor"],
    queryFn: async () => {
      const res = await fetch("/api/admin/monitor");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load monitor");
      return json;
    },
    refetchInterval: 20_000,
  });

  const probe = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/monitor", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Probe failed");
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-monitor"] }),
  });

  const o = data?.overview;
  const users = data?.users ?? [];
  const orgs = data?.orgs ?? [];
  const scans = data?.recentScans ?? [];
  const services = data?.services ?? [];

  if (error) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-red-400">{(error as Error).message}</p>
        <p className="text-sm text-slate-500">Ops Monitor requires demo login or OWNER/ADMIN role.</p>
        <Button variant="secondary" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl font-bold">Ops Monitor</h1>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Platform-wide users, orgs, scans, and system health · auto-refresh 20s
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="glow" size="sm" onClick={() => probe.mutate()} disabled={probe.isPending}>
            Run system probe
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { icon: Users, label: "Total users", value: o?.totalUsers, color: "text-cyan-400" },
          { icon: Wifi, label: "Active sessions", value: o?.activeSessions, color: "text-green-400" },
          { icon: Users, label: "Active 24h", value: o?.usersActive24h, color: "text-purple-400" },
          { icon: Building2, label: "Organizations", value: o?.totalOrgs, color: "text-blue-400" },
          { icon: ScanSearch, label: "Total scans", value: o?.totalScans, color: "text-amber-400" },
          { icon: AlertTriangle, label: "Open critical", value: o?.openCritical, color: "text-red-400" },
          { icon: Activity, label: "Agents online", value: o?.agentsOnline, color: "text-green-400" },
          { icon: Shield, label: "System", value: o?.systemStatus ?? "—", color: "text-cyan-400", capitalize: true },
        ].map(({ icon: Icon, label, value, color, capitalize }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</p>
                  <p className={cn("text-2xl font-mono font-bold mt-1", color, capitalize && "capitalize")}>
                    {isLoading ? "—" : value ?? 0}
                  </p>
                </div>
                <Icon className={cn("w-4 h-4 opacity-50", color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Users</CardTitle>
            <span className="text-xs text-slate-500 font-mono">
              {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : ""}
            </span>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-white/10 bg-white/[0.02]">
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Org</th>
                    <th className="px-3 py-2 font-medium">Tier</th>
                    <th className="px-3 py-2 font-medium">Session</th>
                    <th className="px-3 py-2 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Loading…</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No users</td></tr>
                  ) : (
                    users.map((u: {
                      id: string;
                      email: string;
                      name: string | null;
                      orgName: string | null;
                      tier: string | null;
                      isActiveSession: boolean;
                      createdAt: string;
                      role: string;
                    }) => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-slate-200 truncate max-w-[200px]">{u.name || "—"}</p>
                          <p className="text-xs text-slate-500 font-mono truncate max-w-[200px]">{u.email}</p>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400">{u.orgName || "—"}</td>
                        <td className="px-3 py-2.5">
                          <Badge className="normal-case">{u.tier || u.role}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={u.isActiveSession ? "text-green-400" : "text-slate-600"}>
                            {u.isActiveSession ? "Active" : "Idle"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs font-mono text-slate-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Service health</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {services.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No probes yet — run system probe</p>
            ) : (
              services.map((s: { serviceName: string; status: string; responseMs: number | null }) => (
                <div key={s.serviceName} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/10">
                  <span className="text-sm">{s.serviceName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">{s.responseMs ?? "—"}ms</span>
                    <Badge
                      className={cn(
                        "normal-case",
                        s.status === "healthy" && "bg-green-500/20 text-green-300",
                        s.status === "degraded" && "bg-amber-500/20 text-amber-300",
                        s.status === "down" && "bg-red-500/20 text-red-300"
                      )}
                    >
                      {s.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Organizations</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {orgs.map((org: {
              id: string;
              name: string;
              slug: string;
              subscription: { tier: string; status: string } | null;
              _count: { members: number; scans: number; domains: number; agents: number };
            }) => (
              <div key={org.id} className="p-3 rounded-xl border border-white/10 bg-white/[0.03]">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{org.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{org.slug}</p>
                  </div>
                  <Badge className="normal-case shrink-0">{org.subscription?.tier ?? "—"}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {org._count.members} members · {org._count.domains} domains · {org._count.scans} scans · {org._count.agents} agents
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent scans</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {scans.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No scans yet</p>
            ) : (
              scans.map((s: {
                id: string;
                mode: string;
                status: string;
                findingsCount: number;
                domain: { name: string };
                createdAt: string;
              }) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/[0.03]">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{s.domain?.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{s.mode} · {s.findingsCount} findings</p>
                  </div>
                  <Badge className="normal-case shrink-0">{s.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
