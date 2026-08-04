import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getConfigStatus, getAppUrl } from "@/lib/env";

export type ServiceProbe = {
  name: string;
  status: "healthy" | "degraded" | "down";
  responseMs: number | null;
  details?: Record<string, unknown>;
};

async function timeProbe(name: string, fn: () => Promise<Record<string, unknown>>): Promise<ServiceProbe> {
  const start = Date.now();
  try {
    const details = await fn();
    const responseMs = Date.now() - start;
    const ok = details.ok !== false;
    return {
      name,
      status: ok ? (responseMs > 2000 ? "degraded" : "healthy") : "down",
      responseMs,
      details,
    };
  } catch (err) {
    return {
      name,
      status: "down",
      responseMs: Date.now() - start,
      details: { error: String(err) },
    };
  }
}

/** Run continuous system health probes and persist to HealthCheck. */
export async function runSystemTests(orgId?: string | null): Promise<{
  services: ServiceProbe[];
  overall: "healthy" | "degraded" | "down";
  checkedAt: string;
}> {
  const config = getConfigStatus();
  const base = getAppUrl();

  const services = await Promise.all([
    timeProbe("database", async () => {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true };
    }),
    timeProbe("auth-config", async () => ({
      ok: config.authSecret && config.database,
      authSecret: config.authSecret,
      database: config.database,
    })),
    timeProbe("supabase-api", async () => {
      if (!config.supabase) return { ok: false, reason: "not configured" };
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const res = await fetch(`${url}/rest/v1/`, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      return { ok: res.status < 500, status: res.status };
    }),
    timeProbe("api-health", async () => {
      const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(5000) });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok && json.ready !== false, ...json };
    }),
    timeProbe("scans-table", async () => {
      const count = await prisma.scan.count();
      return { ok: true, count };
    }),
    timeProbe("agents-table", async () => {
      const count = await prisma.agent.count();
      return { ok: true, count };
    }),
    timeProbe("findings-table", async () => {
      const count = await prisma.finding.count();
      return { ok: true, count };
    }),
  ]);

  // Persist (keep last ~500 rows by deleting older in batches)
  await prisma.healthCheck.createMany({
    data: services.map((s) => ({
      orgId: orgId ?? null,
      serviceName: s.name,
      status: s.status,
      responseMs: s.responseMs,
      details: (s.details ?? undefined) as Prisma.InputJsonValue | undefined,
    })),
  });

  const down = services.filter((s) => s.status === "down").length;
  const degraded = services.filter((s) => s.status === "degraded").length;
  const overall = down > 0 ? "down" : degraded > 0 ? "degraded" : "healthy";

  // Prune old checks (keep 48h)
  const cutoff = new Date(Date.now() - 48 * 60 * 60_000);
  await prisma.healthCheck.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => undefined);

  return { services, overall, checkedAt: new Date().toISOString() };
}

export async function getRecentHealthHistory(limit = 100) {
  return prisma.healthCheck.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
