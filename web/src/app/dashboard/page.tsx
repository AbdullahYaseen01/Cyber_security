"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Shield, AlertTriangle, TrendingUp, Activity, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

function SecurityGauge({ score, grade }: { score: number; grade: string }) {
  const color = score >= 91 ? "#00E676" : score >= 71 ? "#00E676" : score >= 41 ? "#FFB800" : "#FF3366";
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={`${score * 2.64} 264`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-mono" style={{ color }}>{score}</span>
          <span className="text-xs text-slate-400">/ 100</span>
        </div>
      </div>
      <div className="mt-2 px-3 py-1 rounded-full text-lg font-bold font-mono" style={{ color, border: `1px solid ${color}40` }}>
        {grade}
      </div>
    </div>
  );
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#FF3366",
  HIGH: "#FF6B35",
  MEDIUM: "#FFB800",
  LOW: "#00F0FF",
};

function WidgetSkeleton() {
  return <div className="h-32 rounded-2xl bg-white/5 animate-pulse" />;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: scoreData, isLoading: scoreLoading } = useQuery({
    queryKey: ["dashboard-score"],
    queryFn: () => fetch("/api/dashboard/score").then((r) => r.json()),
  });

  const { data: threatsData } = useQuery({
    queryKey: ["dashboard-threats"],
    queryFn: () => fetch("/api/dashboard/threats").then((r) => r.json()),
  });

  const { data: modulesData } = useQuery({
    queryKey: ["dashboard-modules"],
    queryFn: () => fetch("/api/dashboard/modules").then((r) => r.json()),
  });

  const { data: findingsData } = useQuery({
    queryKey: ["dashboard-findings"],
    queryFn: () => fetch("/api/dashboard/recent-findings").then((r) => r.json()),
  });

  const { data: agentsData } = useQuery({
    queryKey: ["dashboard-agents"],
    queryFn: () => fetch("/api/dashboard/agents").then((r) => r.json()),
  });

  const { data: complianceData } = useQuery({
    queryKey: ["dashboard-compliance"],
    queryFn: () => fetch("/api/dashboard/compliance").then((r) => r.json()),
  });

  const { data: apiRiskData } = useQuery({
    queryKey: ["dashboard-api-risk"],
    queryFn: () => fetch("/api/dashboard/api-risk").then((r) => r.json()),
  });

  const score = scoreData?.score ?? 0;
  const grade = scoreData?.grade ?? "F";
  const threats = threatsData?.threats ?? [];
  const modules = modulesData?.modules ?? [];
  const findings = findingsData?.findings ?? [];
  const agentCounts = agentsData?.agents ?? { ONLINE: 0, OFFLINE: 0, WARNING: 0, QUARANTINED: 0 };
  const compliance = complianceData?.compliance ?? [];
  const apiRisk = apiRiskData?.distribution ?? [];

  const totalThreats = threats.reduce((s: number, t: { count: number }) => s + t.count, 0);
  const criticalCount = threats.find((t: { severity: string }) => t.severity === "CRITICAL")?.count ?? 0;

  const agentPieData = [
    { name: "Online", value: agentCounts.ONLINE, color: "#00E676" },
    { name: "Offline", value: agentCounts.OFFLINE, color: "#64748B" },
    { name: "Warning", value: agentCounts.WARNING, color: "#FFB800" },
    { name: "Quarantined", value: agentCounts.QUARANTINED, color: "#FF3366" },
  ].filter((d) => d.value > 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Security Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          {user ? `Welcome back, ${user.orgName}` : "Unified security overview"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Shield, label: "Security Score", value: scoreLoading ? "—" : String(score), sub: `Grade ${grade}`, color: "text-cyan-400" },
          { icon: AlertTriangle, label: "Active Threats", value: String(totalThreats), sub: `${criticalCount} critical`, color: "text-red-400" },
          { icon: TrendingUp, label: "Scans This Month", value: user ? `${user.scansUsed}` : "0", sub: `of ${user?.scansLimit ?? 10}`, color: "text-purple-400" },
          { icon: Activity, label: "Agents Online", value: String(agentsData?.online ?? 0), sub: `of ${agentsData?.total ?? 0} total`, color: "text-green-400" },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <Card key={label} className="hover:border-cyan-500/20 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className={`text-3xl font-bold font-mono mt-1 ${color}`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{sub}</p>
                </div>
                <Icon className={`w-5 h-5 ${color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {threats.map((t: { severity: string; count: number; trend: number }) => (
          <Link key={t.severity} href={`/dashboard/scanner/findings?severity=${t.severity}`}>
            <Card className={cn(
              "hover:scale-[1.01] transition-transform cursor-pointer",
              t.severity === "CRITICAL" && "border-red-500/30 animate-pulse-glow"
            )}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <Badge severity={t.severity as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"}>{t.severity}</Badge>
                  {t.trend !== 0 && (
                    t.trend > 0
                      ? <ArrowUp className="w-4 h-4 text-red-400" />
                      : <ArrowDown className="w-4 h-4 text-green-400" />
                  )}
                </div>
                <p className="text-2xl font-bold font-mono mt-2" style={{ color: SEVERITY_COLORS[t.severity] }}>
                  {t.count}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Security Score</CardTitle></CardHeader>
          <CardContent className="flex justify-center pb-6">
            {scoreLoading ? <WidgetSkeleton /> : <SecurityGauge score={score} grade={grade} />}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Module Health</CardTitle></CardHeader>
          <CardContent>
            {modules.length === 0 ? (
              <WidgetSkeleton />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {modules.map((m: { id: string; label: string; score: number; locked: boolean; status: string }) => (
                  <div key={m.id} className={cn("p-3 rounded-xl bg-white/5 border border-white/5", m.locked && "opacity-50")}>
                    <p className="text-xs text-slate-400 truncate">{m.label}</p>
                    <p className="text-xl font-mono font-bold text-cyan-400">{m.locked ? "—" : m.score}</p>
                    <div className="h-1 rounded-full bg-white/10 mt-2">
                      <div
                        className="h-full rounded-full bg-cyan-400"
                        style={{ width: `${m.locked ? 0 : m.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Critical Findings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {findings.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No critical findings yet. Run a scan to get started.</p>
            ) : (
              findings.map((f: { id: string; title: string; severity: string; domain: string; url: string; timeAgo: string }) => (
                <div key={f.id} className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge severity={f.severity as "CRITICAL" | "HIGH"}>{f.severity}</Badge>
                    <span className="text-xs text-slate-500">{f.timeAgo}</span>
                  </div>
                  <p className="text-sm text-slate-200 truncate">{f.title}</p>
                  <p className="text-xs text-slate-500 truncate">{f.domain}</p>
                </div>
              ))
            )}
            <Link href="/dashboard/scanner/findings" className="text-xs text-cyan-400 hover:underline">
              View all findings →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Agent Status</CardTitle></CardHeader>
          <CardContent>
            {agentPieData.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No agents deployed</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={agentPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={4}>
                      {agentPieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0F1525", border: "1px solid rgba(255,255,255,0.1)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-center text-sm text-slate-400">{agentsData?.online ?? 0} Agents Online</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>API Risk Distribution</CardTitle></CardHeader>
          <CardContent>
            {apiRisk.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No API endpoints discovered</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={apiRisk}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="bucket" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#0F1525", border: "1px solid rgba(255,255,255,0.1)" }} />
                  <Bar dataKey="count" fill="#00F0FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {compliance.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Compliance Progress</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {compliance.map((fw: { framework: string; percentage: number; complete: number; inProgress: number; notStarted: number; total: number }) => (
              <div key={fw.framework}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{fw.framework}</span>
                  <span className="font-mono text-cyan-400">{fw.percentage}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 flex overflow-hidden">
                  <div className="bg-green-500" style={{ width: `${fw.total ? (fw.complete / fw.total) * 100 : 0}%` }} />
                  <div className="bg-amber-500" style={{ width: `${fw.total ? (fw.inProgress / fw.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
