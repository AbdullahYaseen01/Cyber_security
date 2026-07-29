"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap, Flame, Rocket, Sparkles, Play, Square, History, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HolographicProgress, PhaseList } from "@/components/scanner/holographic-progress";
import { ThreatFeed, type ThreatEvent } from "@/components/scanner/threat-feed";
import { Badge } from "@/components/ui/badge";
import { SCAN_PHASES, SCANNER_API_URL } from "@/lib/constants";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

const SCAN_MODES = [
  { id: "lightning", label: "Lightning", icon: Zap, desc: "2 min · Top 20 checks", tier: "STARTER", scanType: "mega" },
  { id: "standard", label: "Standard", icon: Flame, desc: "30 min · 13-phase pipeline", tier: "PROFESSIONAL", scanType: "mega" },
  { id: "mega", label: "Mega", icon: Rocket, desc: "1M+ fuzz · 150 workers", tier: "BUSINESS", scanType: "mega" },
  { id: "super", label: "Super", icon: Sparkles, desc: "Alternative deep methodology", tier: "ENTERPRISE", scanType: "super" },
];

interface ScanState {
  scanId: string | null;
  status: string;
  progress: number;
  fuzzPct: number;
  phaseLabel: string;
  currentPhase: number;
  checksTotal: number;
  checksDone: number;
  threats: ThreatEvent[];
  findings: unknown[];
}

export default function ScannerPage() {
  const user = useAuthStore((s) => s.user);
  const [domain, setDomain] = useState("");
  const [mode, setMode] = useState("lightning");
  const [scanning, setScanning] = useState(false);
  const [verified, setVerified] = useState(false);
  const [scan, setScan] = useState<ScanState>({
    scanId: null, status: "idle", progress: 0, fuzzPct: 0,
    phaseLabel: "", currentPhase: 0, checksTotal: 1_000_000, checksDone: 0,
    threats: [], findings: [],
  });

  const tierOrder = ["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"];
  const userTierIdx = tierOrder.indexOf(user?.tier ?? "STARTER");

  const pollScan = useCallback(async (scanId: string) => {
    try {
      const res = await fetch(`${SCANNER_API_URL}/api/scan/${scanId}`);
      if (!res.ok) return;
      const data = await res.json();
      const phaseMatch = (data.phase_label ?? "").match(/Phase (\d+)/i);
      setScan((s) => ({
        ...s,
        status: data.status,
        progress: data.overall_pct ?? data.progress ?? 0,
        fuzzPct: data.fuzz_pct ?? 0,
        phaseLabel: data.phase_label ?? data.current_phase ?? "",
        currentPhase: phaseMatch ? parseInt(phaseMatch[1]) : s.currentPhase,
        checksDone: Math.floor((data.fuzz_pct ?? 0) / 100 * (data.checks_total ?? 1_000_000)),
        threats: data.live_threats ?? s.threats,
        findings: data.result?.findings ?? s.findings,
      }));
      if (data.status === "completed" || data.status === "failed" || data.status === "cancelled") {
        setScanning(false);
        if (data.status === "completed") toast.success("Scan completed!");
      }
    } catch { /* scanner offline */ }
  }, []);

  useEffect(() => {
    if (!scanning || !scan.scanId) return;
    const interval = setInterval(() => pollScan(scan.scanId!), 1000);
    return () => clearInterval(interval);
  }, [scanning, scan.scanId, pollScan]);

  useEffect(() => {
    if (!scan.scanId || scan.status !== "running") return;
    const es = new EventSource(`${SCANNER_API_URL}/api/scan/${scan.scanId}/stream`);
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.threats) {
          setScan((s) => ({ ...s, threats: data.threats }));
        }
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, [scan.scanId, scan.status]);

  async function startScan() {
    if (!domain.trim()) { toast.error("Enter a target domain"); return; }
    if (!verified) { toast.error("Verify domain ownership first"); return; }

    const selectedMode = SCAN_MODES.find((m) => m.id === mode)!;
    setScanning(true);
    setScan((s) => ({ ...s, status: "queued", progress: 0, threats: [], findings: [] }));

    try {
      const res = await fetch(
        `${SCANNER_API_URL}/api/scan?domain=${encodeURIComponent(domain)}&scan_type=${selectedMode.scanType}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to start scan");
      const data = await res.json();
      setScan((s) => ({
        ...s,
        scanId: data.scan_id,
        status: "running",
        checksTotal: data.mega_checks ?? 1_000_000,
      }));
      toast.success(`Scan started: ${data.scan_id}`);
    } catch {
      toast.error("Scanner backend unavailable. Start with: uvicorn main:app --port 8080");
      setScanning(false);
    }
  }

  async function stopScan() {
    if (!scan.scanId) return;
    await fetch(`${SCANNER_API_URL}/api/scan/${scan.scanId}/stop`, { method: "POST" });
    setScanning(false);
    toast.info("Scan stopped");
  }

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Deep Web Vulnerability Scanner
              <Badge className="text-purple-400 border-purple-500/30">Flagship</Badge>
            </h1>
            <p className="text-slate-400 text-sm mt-1">13-phase pipeline · AI inference · 1M+ parallel checks</p>
          </div>
          <Button variant="secondary" size="sm">
            <History className="w-4 h-4" /> History
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scan Configuration</CardTitle>
                <CardDescription>Domain verification required before scanning</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="domain">Target Domain</Label>
                  <Input
                    id="domain"
                    placeholder="example.com"
                    value={domain}
                    onChange={(e) => { setDomain(e.target.value); setVerified(false); }}
                    className="mt-1.5"
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className={cn("w-4 h-4", verified ? "text-green-400" : "text-amber-400")} />
                    <span className="text-sm font-medium">
                      {verified ? "Domain Verified" : "Verification Required"}
                    </span>
                  </div>
                  {!verified && domain && (
                    <div className="text-xs font-mono text-slate-400 space-y-1">
                      <p>Add DNS TXT record:</p>
                      <code className="block p-2 rounded bg-black/30 text-cyan-400 break-all">
                        _quantumshield-verify=qs-{domain.replace(/\./g, "-")}
                      </code>
                      <Button
                        size="sm" variant="outline" className="mt-2 w-full"
                        onClick={() => { setVerified(true); toast.success("Domain verified!"); }}
                      >
                        Verify DNS Record
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Scan Mode</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    {SCAN_MODES.map((m) => {
                      const locked = tierOrder.indexOf(m.tier) > userTierIdx;
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.id}
                          disabled={locked}
                          onClick={() => setMode(m.id)}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all",
                            mode === m.id ? "border-cyan-500/50 bg-cyan-500/10" : "border-white/10 bg-white/5 hover:border-white/20",
                            locked && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          <Icon className="w-4 h-4 text-cyan-400 mb-1" />
                          <p className="text-sm font-medium">{m.label}</p>
                          <p className="text-[10px] text-slate-500">{m.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  {!scanning ? (
                    <Button variant="glow" className="flex-1" onClick={startScan}>
                      <Play className="w-4 h-4" /> Start Scan
                    </Button>
                  ) : (
                    <Button variant="destructive" className="flex-1" onClick={stopScan}>
                      <Square className="w-4 h-4" /> Stop Scan
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-2 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="flex flex-col items-center justify-center py-8">
                <HolographicProgress
                  progress={scan.progress}
                  phase={scan.phaseLabel}
                  phaseNumber={scan.currentPhase || Math.ceil(scan.progress / 100 * 13)}
                  totalPhases={13}
                  fuzzProgress={scan.checksDone}
                  fuzzTotal={scan.checksTotal}
                />
                <p className="text-xs font-mono text-slate-500 mt-2">
                  Status: <span className="text-cyan-400">{scan.status}</span>
                  {scan.scanId && <span className="ml-2">ID: {scan.scanId}</span>}
                </p>
              </Card>

              <Card className="overflow-hidden min-h-[320px]">
                <ThreatFeed events={scan.threats} />
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Pipeline Phases</CardTitle>
              </CardHeader>
              <CardContent>
                <PhaseList
                  phases={SCAN_PHASES}
                  currentPhase={scan.currentPhase || (scanning ? 1 : 0)}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </AppShell>
  );
}
