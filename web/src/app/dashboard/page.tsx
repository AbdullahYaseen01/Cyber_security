"use client";

import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Shield, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store";

const trendData = [
  { day: "Mon", score: 72, findings: 12 },
  { day: "Tue", score: 68, findings: 18 },
  { day: "Wed", score: 75, findings: 9 },
  { day: "Thu", score: 71, findings: 14 },
  { day: "Fri", score: 78, findings: 7 },
  { day: "Sat", score: 82, findings: 4 },
  { day: "Sun", score: 85, findings: 3 },
];

const moduleScores = [
  { name: "Scanner", score: 78, color: "#00F0FF" },
  { name: "API", score: 65, color: "#7C3AED" },
  { name: "Cloud", score: 82, color: "#00E676" },
  { name: "Compliance", score: 71, color: "#FFB800" },
];

const recentFindings = [
  { id: 1, title: "SQL Injection in /api/search", severity: "CRITICAL" as const, url: "/api/search?q=" },
  { id: 2, title: "Missing HSTS header", severity: "MEDIUM" as const, url: "https://example.com" },
  { id: 3, title: "CORS wildcard origin", severity: "HIGH" as const, url: "/api/users" },
];

const agentData = [
  { name: "Online", value: 12, color: "#00E676" },
  { name: "Offline", value: 3, color: "#FF3366" },
];

function SecurityGauge({ score }: { score: number }) {
  const grade = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : "D";
  const color = score >= 80 ? "#00E676" : score >= 60 ? "#FFB800" : "#FF3366";

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

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Security Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            {user ? `Welcome back, ${user.orgName}` : "Unified security overview"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Shield, label: "Security Score", value: "78", sub: "+6 this week", color: "text-cyan-400" },
            { icon: AlertTriangle, label: "Active Threats", value: "23", sub: "5 critical", color: "text-red-400" },
            { icon: TrendingUp, label: "Scans This Month", value: user ? `${user.scansUsed}` : "0", sub: `of ${user?.scansLimit ?? 10}`, color: "text-purple-400" },
            { icon: Activity, label: "Compliance", value: "71%", sub: "ISO 27001", color: "text-green-400" },
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Security Score</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <SecurityGauge score={78} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Risk Trend (7 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00F0FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={[50, 100]} />
                  <Tooltip
                    contentStyle={{ background: "#0F1525", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#00F0FF" fill="url(#scoreGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Module Scores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {moduleScores.map((m) => (
                <div key={m.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{m.name}</span>
                    <span className="font-mono" style={{ color: m.color }}>{m.score}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10">
                    <div className="h-full rounded-full transition-all" style={{ width: `${m.score}%`, background: m.color }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Critical Findings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentFindings.map((f) => (
                <div key={f.id} className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge severity={f.severity}>{f.severity}</Badge>
                  </div>
                  <p className="text-sm text-slate-200 truncate">{f.title}</p>
                  <p className="text-xs text-cyan-500/60 font-mono truncate mt-0.5">{f.url}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agent Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={agentData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={4}>
                    {agentData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0F1525", border: "1px solid rgba(255,255,255,0.1)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-xs">
                {agentData.map((d) => (
                  <span key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    {d.name}: {d.value}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </AppShell>
  );
}
