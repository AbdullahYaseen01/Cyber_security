"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  Shield, AlertTriangle, TrendingUp, Activity, ArrowUp, ArrowDown,
  ScanSearch, Plug, Cloud, ClipboardCheck, Sparkles, ArrowRight, Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { label: "New Scan", href: "/dashboard/scanner", icon: ScanSearch, color: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400" },
  { label: "API Security", href: "/dashboard/api-security", icon: Plug, color: "from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400" },
  { label: "Cloud Guard", href: "/dashboard/cloud-guard", icon: Cloud, color: "from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400" },
  { label: "Compliance", href: "/dashboard/compliance", icon: ClipboardCheck, color: "from-green-500/20 to-green-500/5 border-green-500/30 text-green-400" },
];

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

const stagger = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35 },
  }),
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isDemo = user?.isDemo;

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

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Welcome hero */}
      <motion.div
        custom={0}
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-[#0F1525] to-purple-600/10 p-6 md:p-8"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {isDemo && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <Sparkles className="w-3 h-3" />
                  Full Access Demo
                </span>
              )}
              <span className="text-xs text-slate-500 uppercase tracking-wider">Security Command Center</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">{firstName}</span>
            </h1>
            <p className="text-slate-400 text-sm mt-2 max-w-xl">
              {user?.orgName ?? "Your organization"} — unified view of threats, agents, API risk, and compliance posture.
            </p>
          </div>
          <Button variant="glow" asChild className="shrink-0">
            <Link href="/dashboard/scanner">
              <Zap className="w-4 h-4" />
              Launch Deep Scan
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map((action, i) => (
          <motion.div key={action.label} custom={i + 1} variants={stagger} initial="hidden" animate="show">
            <Link href={action.href}>
              <div className={cn(
                "group p-4 rounded-xl border bg-gradient-to-br transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-500/5",
                action.color
              )}>
                <action.icon className="w-5 h-5 mb-2 opacity-80 group-hover:opacity-100" />
                <p className="text-sm font-medium text-slate-200">{action.label}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Shield, label: "Security Score", value: scoreLoading ? "—" : String(score), sub: `Grade ${grade}`, color: "text-cyan-400" },
          { icon: AlertTriangle, label: "Active Threats", value: String(totalThreats), sub: `${criticalCount} critical`, color: "text-red-400" },
          { icon: TrendingUp, label: "Scans This Month", value: user ? `${user.scansUsed}` : "0", sub: isDemo ? "Unlimited" : `of ${user?.scansLimit ?? 10}`, color: "text-purple-400" },
          { icon: Activity, label: "Agents Online", value: String(agentsData?.online ?? 0), sub: `of ${agentsData?.total ?? 0} total`, color: "text-green-400" },
        ].map(({ icon: Icon, label, value, sub, color }, i) => (
          <motion.div key={label} custom={i + 5} variants={stagger} initial="hidden" animate="show">
            <Card className="hover:border-cyan-500/20 transition-colors h-full">
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
          </motion.div>
        ))}
      </div>

      {/* Threat severity row */}
      {threats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {threats.map((t: { severity: string; count: number; trend: number }) => (
            <Link key={t.severity} href={`/dashboard/scanner/findings?severity=${t.severity}`}>
              <Card className={cn(
                "hover:scale-[1.01] transition-transform cursor-pointer h-full",
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
      )}

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
                        className="h-full rounded-full bg-cyan-400 transition-all"
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
              <div className="text-center py-8">
                <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No critical findings yet.</p>
                <Button variant="secondary" size="sm" className="mt-3" asChild>
                  <Link href="/dashboard/scanner">Run your first scan</Link>
                </Button>
              </div>
            ) : (
              findings.map((f: { id: string; title: string; severity: string; domain: string; url: string; timeAgo: string }) => (
                <div key={f.id} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/20 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge severity={f.severity as "CRITICAL" | "HIGH"}>{f.severity}</Badge>
                    <span className="text-xs text-slate-500">{f.timeAgo}</span>
                  </div>
                  <p className="text-sm text-slate-200 truncate">{f.title}</p>
                  <p className="text-xs text-slate-500 truncate">{f.domain}</p>
                </div>
              ))
            )}
            {findings.length > 0 && (
              <Link href="/dashboard/scanner/findings" className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1">
                View all findings <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Agent Status</CardTitle></CardHeader>
          <CardContent>
            {agentPieData.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No agents deployed</p>
                <Button variant="secondary" size="sm" className="mt-3" asChild>
                  <Link href="/dashboard/agent-security">Deploy agents</Link>
                </Button>
              </div>
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
              <div className="text-center py-8">
                <Plug className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No API endpoints discovered</p>
                <Button variant="secondary" size="sm" className="mt-3" asChild>
                  <Link href="/dashboard/api-security">Scan APIs</Link>
                </Button>
              </div>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Compliance Progress</CardTitle>
            <Link href="/dashboard/compliance" className="text-xs text-cyan-400 hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {compliance.map((fw: { framework: string; percentage: number; complete: number; inProgress: number; notStarted: number; total: number }) => (
              <div key={fw.framework}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{fw.framework}</span>
                  <span className="font-mono text-cyan-400">{fw.percentage}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 flex overflow-hidden">
                  <div className="bg-green-500 transition-all" style={{ width: `${fw.total ? (fw.complete / fw.total) * 100 : 0}%` }} />
                  <div className="bg-amber-500 transition-all" style={{ width: `${fw.total ? (fw.inProgress / fw.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
