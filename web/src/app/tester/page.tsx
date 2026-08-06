"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  FlaskConical,
  Loader2,
  Play,
  RefreshCw,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PortalShell } from "@/components/layout/portal-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TesterPayload = {
  staff: Array<{
    id: string;
    email: string;
    name: string | null;
    platformRole: string;
    approvalStatus: string;
    lastLoginAt: string | null;
  }>;
  testRuns: Array<{
    id: string;
    name: string;
    suite: string;
    status: string;
    passed: number;
    failed: number;
    durationMs: number | null;
    createdAt: string;
  }>;
  health: Array<{
    id: string;
    serviceName: string;
    status: string;
    responseMs: number | null;
    createdAt: string;
  }>;
  agents: Array<{
    id: string;
    name: string;
    status: string;
    agentType: string;
    lastRunAt: string | null;
    org: { name: string };
  }>;
};

const NAV = [
  { href: "/tester", label: "QA console", icon: FlaskConical },
  { href: "/tester#staff", label: "Staff", icon: Users },
  { href: "/tester#health", label: "Health", icon: Activity },
];

export default function TesterDashboardPage() {
  const [data, setData] = useState<TesterPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tester/manage", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load tester data");
      setData(await res.json());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSystemTests() {
    setRunning(true);
    try {
      const res = await fetch("/api/tester/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_system_tests", name: "Tester system suite" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Test run failed");
      }
      toast.success("System tests completed");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test run failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <PortalShell
      title="Tester console"
      subtitle="QA runs · system health · staff"
      accent="bg-gradient-to-br from-amber-400 to-orange-500"
      nav={NAV}
      loginPath="/tester/login"
    >
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <p className="eyebrow">Quality assurance</p>
          <h1 className="text-[22px] font-semibold tracking-tight mt-1">Tester dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </Button>
          <Button variant="glow" size="sm" onClick={() => void runSystemTests()} disabled={running}>
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Run system tests
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="card p-10 grid place-items-center text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : data ? (
        <div className="space-y-5 animate-rise">
          <section className="card overflow-hidden">
            <div className="px-4 py-3 border-b">
              <p className="text-[14px] font-semibold">Recent test runs</p>
              <p className="text-[12px] text-muted">System and manual QA suites</p>
            </div>
            {data.testRuns.length === 0 ? (
              <div className="p-8 text-center text-muted text-[13px]">
                No runs yet — click “Run system tests” to start.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {data.testRuns.map((run) => (
                  <div key={run.id} className="px-4 py-3 flex items-center gap-4">
                    <div
                      className={cn(
                        "chip",
                        run.status === "PASSED" && "text-emerald-300 border-emerald-400/30",
                        run.status === "FAILED" && "text-rose-300 border-rose-400/30",
                        run.status === "RUNNING" && "text-amber-300 border-amber-400/30"
                      )}
                    >
                      {run.status}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium truncate">{run.name}</p>
                      <p className="text-[11.5px] text-muted">
                        {run.suite} · {run.passed} passed · {run.failed} failed
                        {run.durationMs != null ? ` · ${run.durationMs}ms` : ""}
                      </p>
                    </div>
                    <p className="text-[11px] text-subtle tabular">
                      {new Date(run.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid lg:grid-cols-2 gap-5">
            <section id="staff" className="card overflow-hidden">
              <div className="px-4 py-3 border-b">
                <p className="text-[14px] font-semibold">Staff</p>
                <p className="text-[12px] text-muted">Testers and admins</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {data.staff.map((person) => (
                  <div key={person.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-[12px] font-bold text-[#0b1220]">
                      {(person.name?.[0] ?? person.email[0]).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium truncate">{person.name ?? person.email}</p>
                      <p className="text-[11.5px] text-muted truncate">{person.email}</p>
                    </div>
                    <span className="chip">{person.platformRole}</span>
                  </div>
                ))}
              </div>
            </section>

            <section id="health" className="card overflow-hidden">
              <div className="px-4 py-3 border-b">
                <p className="text-[14px] font-semibold">Service health</p>
                <p className="text-[12px] text-muted">Latest probe results</p>
              </div>
              {data.health.length === 0 ? (
                <div className="p-8 text-center text-muted text-[13px]">No health checks yet.</div>
              ) : (
                <div className="divide-y divide-white/[0.04] max-h-[360px] overflow-y-auto">
                  {data.health.map((row) => (
                    <div key={row.id} className="px-4 py-2.5 flex items-center gap-3 text-[13px]">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          row.status === "ok" || row.status === "healthy"
                            ? "bg-emerald-400"
                            : "bg-rose-400"
                        )}
                      />
                      <span className="flex-1 truncate font-medium">{row.serviceName}</span>
                      <span className="text-muted tabular">{row.responseMs ?? "—"}ms</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="card overflow-hidden">
            <div className="px-4 py-3 border-b">
              <p className="text-[14px] font-semibold">Agent fleet snapshot</p>
              <p className="text-[12px] text-muted">Cross-org agent status for QA monitoring</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {data.agents.length === 0 ? (
                <div className="p-8 text-center text-muted text-[13px]">No agents found.</div>
              ) : (
                data.agents.map((agent) => (
                  <div key={agent.id} className="px-4 py-3 flex items-center gap-3 text-[13px]">
                    <span
                      className={cn(
                        "chip",
                        agent.status === "ONLINE" && "text-emerald-300 border-emerald-400/30",
                        agent.status === "WARNING" && "text-amber-300 border-amber-400/30",
                        agent.status === "OFFLINE" && "text-rose-300 border-rose-400/30"
                      )}
                    >
                      {agent.status}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{agent.name}</p>
                      <p className="text-[11.5px] text-muted">
                        {agent.org.name} · {agent.agentType}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </PortalShell>
  );
}
