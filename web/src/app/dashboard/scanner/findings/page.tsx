"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

export default function FindingsPage() {
  const searchParams = useSearchParams();
  const scanId = searchParams.get("scanId");
  const severity = searchParams.get("severity");

  const queryKey = ["findings", scanId, severity];
  const queryUrl = `/api/findings?${new URLSearchParams({
    ...(scanId ? { scanId } : {}),
    ...(severity ? { severity } : {}),
  }).toString()}`;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetch(queryUrl).then((r) => r.json()),
  });

  const findings = data?.findings ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Findings</h1>
        <p className="text-slate-400 text-sm mt-1">
          {scanId ? "Findings for selected scan" : "All vulnerability findings"}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>{findings.length} Findings</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div>
          ) : findings.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No findings match your filters.</p>
          ) : (
            <div className="space-y-3">
              {findings.map((f: {
                id: string;
                title: string;
                severity: string;
                url: string;
                parameter?: string;
                confidence: number;
                status: string;
                domain: { name: string };
                createdAt: string;
              }) => (
                <div key={f.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/20 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge severity={f.severity as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"}>{f.severity}</Badge>
                    <Badge>{f.status}</Badge>
                    <span className="text-xs text-slate-500 ml-auto">
                      {formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="font-medium text-slate-200">{f.title}</p>
                  <p className="text-xs text-cyan-500/60 font-mono mt-1">{f.url}{f.parameter ? ` · ${f.parameter}` : ""}</p>
                  <p className="text-xs text-slate-500 mt-1">{f.domain.name} · Confidence: {Math.round(f.confidence * 100)}%</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
