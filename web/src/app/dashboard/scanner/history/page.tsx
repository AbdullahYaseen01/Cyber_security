"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ScanHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["scans"],
    queryFn: () => fetch("/api/scans").then((r) => r.json()),
  });

  const scans = data?.scans ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scan History</h1>
          <p className="text-slate-400 text-sm mt-1">Past security assessments</p>
        </div>
        <Button variant="glow" asChild>
          <Link href="/dashboard/scanner/new">New Scan</Link>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Scans</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}</div>
          ) : scans.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No scans yet. Launch your first scan.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-left">
                    <th className="pb-3">Target</th>
                    <th className="pb-3">Mode</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Findings</th>
                    <th className="pb-3">Completed</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((s: {
                    id: string;
                    domain: { name: string };
                    mode: string;
                    status: string;
                    findingsCount: number;
                    completedAt: string | null;
                  }) => (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 font-mono">{s.domain?.name}</td>
                      <td className="py-3"><Badge>{s.mode}</Badge></td>
                      <td className="py-3"><Badge severity={s.status === "COMPLETED" ? "INFO" : "MEDIUM"}>{s.status}</Badge></td>
                      <td className="py-3 font-mono">{s.findingsCount}</td>
                      <td className="py-3 text-slate-400">
                        {s.completedAt ? formatDistanceToNow(new Date(s.completedAt), { addSuffix: true }) : "—"}
                      </td>
                      <td className="py-3">
                        <Button size="sm" variant="secondary" asChild>
                          <Link href={`/dashboard/scanner/scan/${s.id}`}>View</Link>
                        </Button>
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
