"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FindingRow = {
  id: string;
  title: string;
  description?: string | null;
  severity: string;
  url: string;
  parameter?: string | null;
  confidence?: number | null;
  status: string;
  remediation?: string | null;
  cweId?: string | null;
  domain?: { name: string } | null;
  createdAt: string;
};

function FindingsContent() {
  const searchParams = useSearchParams();
  const scanId = searchParams.get("scanId");
  const severity = searchParams.get("severity");
  const [openId, setOpenId] = useState<string | null>(null);

  const queryUrl = `/api/findings?${new URLSearchParams({
    ...(scanId ? { scanId } : {}),
    ...(severity ? { severity } : {}),
  }).toString()}`;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["findings", scanId, severity],
    queryFn: async () => {
      const res = await fetch(queryUrl, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load findings");
      return json as { findings: FindingRow[] };
    },
    refetchOnMount: "always",
    staleTime: 0,
  });

  const findings = data?.findings ?? [];

  return (
    <div className="space-y-5 animate-rise">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {scanId && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/scanner/scan/${scanId}`}>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
            )}
            <h1 className="text-2xl font-bold">Findings</h1>
          </div>
          <p className="text-muted text-sm">
            {scanId ? "Findings for this scan" : "All vulnerability findings for your organization"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void refetch()}>
            Refresh
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/dashboard/scanner/history">History</Link>
          </Button>
        </div>
      </div>

      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isLoading ? "Loading…" : `${findings.length} finding${findings.length === 1 ? "" : "s"}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-rose-300 text-sm">
                {error instanceof Error ? error.message : "Could not load findings"}
              </p>
              <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                Try again
              </Button>
            </div>
          ) : findings.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-muted text-sm">No findings match your filters.</p>
              {scanId && (
                <p className="text-subtle text-xs">
                  If the scan just finished, wait a moment and refresh — or open{" "}
                  <Link href={`/dashboard/scanner/scan/${scanId}`} className="text-cyan-300 underline">
                    the scan detail
                  </Link>
                  .
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {findings.map((f) => {
                const open = openId === f.id;
                const conf = typeof f.confidence === "number" ? Math.round(f.confidence * 100) : null;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setOpenId(open ? null : f.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-colors",
                      "bg-white/[0.03] border-white/10 hover:border-cyan-400/30"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge
                        severity={
                          (["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].includes(f.severity)
                            ? f.severity
                            : "INFO") as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"
                        }
                      >
                        {f.severity}
                      </Badge>
                      <Badge>{f.status}</Badge>
                      {f.cweId && <span className="text-[11px] text-subtle font-mono">{f.cweId}</span>}
                      <span className="text-xs text-subtle ml-auto">
                        {f.createdAt
                          ? formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })
                          : "—"}
                      </span>
                    </div>
                    <p className="font-medium text-[14.5px]">{f.title}</p>
                    <p className="text-xs text-cyan-300/80 font-mono mt-1 break-all">
                      {f.url}
                      {f.parameter ? ` · ${f.parameter}` : ""}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {f.domain?.name ?? "—"}
                      {conf != null ? ` · Confidence ${conf}%` : ""}
                    </p>
                    {open && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-2 text-sm">
                        {f.description && <p className="text-muted whitespace-pre-wrap">{f.description}</p>}
                        {f.remediation && (
                          <p>
                            <span className="text-subtle text-xs uppercase tracking-wide">Remediation</span>
                            <br />
                            <span className="text-foreground/90">{f.remediation}</span>
                          </p>
                        )}
                        {scanId && (
                          <Link
                            href={`/dashboard/scanner/scan/${scanId}`}
                            className="inline-flex items-center gap-1 text-cyan-300 text-xs hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Open scan <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function FindingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-8 w-40 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-64 glass rounded-2xl animate-pulse" />
        </div>
      }
    >
      <FindingsContent />
    </Suspense>
  );
}
