"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ScanRow = {
  id: string;
  domain: { name: string };
  mode: string;
  status: string;
  findingsCount: number;
  criticalCount?: number;
  highCount?: number;
  completedAt: string | null;
  createdAt: string;
  user?: { email: string; name: string | null } | null;
  config?: { reportEmail?: string; reportDeliveredAt?: string } | null;
};

export default function ScanHistoryPage() {
  const [mineOnly, setMineOnly] = useState(true);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["scans", mineOnly ? "mine" : "org"],
    queryFn: async () => {
      const res = await fetch(`/api/scans?mine=${mineOnly ? "1" : "0"}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load scans");
      return json as { scans: ScanRow[] };
    },
    refetchOnMount: "always",
    staleTime: 0,
  });

  const scans = data?.scans ?? [];

  return (
    <div className="space-y-5 animate-rise">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Scan history</h1>
          <p className="text-muted text-sm mt-1">
            {mineOnly ? "Scans you have launched" : "All organization scans"}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-xl border border-white/10 p-0.5 bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setMineOnly(true)}
              className={cn(
                "px-3 h-8 rounded-[10px] text-xs font-medium transition-colors",
                mineOnly ? "bg-cyan-400/15 text-cyan-200" : "text-muted hover:text-foreground"
              )}
            >
              My scans
            </button>
            <button
              type="button"
              onClick={() => setMineOnly(false)}
              className={cn(
                "px-3 h-8 rounded-[10px] text-xs font-medium transition-colors",
                !mineOnly ? "bg-cyan-400/15 text-cyan-200" : "text-muted hover:text-foreground"
              )}
            >
              All org
            </button>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            Refresh
          </Button>
          <Button variant="glow" size="sm" asChild>
            <Link href="/dashboard/scanner/new">New scan</Link>
          </Button>
        </div>
      </div>

      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{scans.length} scan{scans.length === 1 ? "" : "s"}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : scans.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-muted text-sm">No scans yet.</p>
              <Button variant="glow" size="sm" asChild>
                <Link href="/dashboard/scanner/new">Start your first scan</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-muted text-left">
                    <th className="pb-3 font-medium">Target</th>
                    <th className="pb-3 font-medium">Mode</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Findings</th>
                    {!mineOnly && <th className="pb-3 font-medium">User</th>}
                    <th className="pb-3 font-medium">When</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((s) => (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="py-3 font-mono">{s.domain?.name ?? "—"}</td>
                      <td className="py-3">
                        <Badge>{s.mode}</Badge>
                      </td>
                      <td className="py-3">
                        <Badge severity={s.status === "COMPLETED" ? "INFO" : "MEDIUM"}>{s.status}</Badge>
                      </td>
                      <td className="py-3 font-mono">
                        {s.findingsCount}
                        {(s.criticalCount || s.highCount) ? (
                          <span className="text-subtle text-xs ml-1">
                            (C:{s.criticalCount ?? 0}/H:{s.highCount ?? 0})
                          </span>
                        ) : null}
                      </td>
                      {!mineOnly && (
                        <td className="py-3 text-muted text-xs truncate max-w-[140px]">
                          {s.user?.email ?? "—"}
                        </td>
                      )}
                      <td className="py-3 text-muted">
                        {formatDistanceToNow(new Date(s.completedAt ?? s.createdAt), {
                          addSuffix: true,
                        })}
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="secondary" asChild>
                            <Link href={`/dashboard/scanner/findings?scanId=${s.id}`}>Findings</Link>
                          </Button>
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/dashboard/scanner/scan/${s.id}`}>View</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
