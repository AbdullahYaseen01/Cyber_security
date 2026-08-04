import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-auth";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { runSystemTests, getRecentHealthHistory } from "@/lib/system-tester";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin(request);

    const now = Date.now();
    const dayAgo = new Date(now - 24 * 60 * 60_000);
    const weekAgo = new Date(now - 7 * 24 * 60 * 60_000);

    const [
      totalUsers,
      totalOrgs,
      totalScans,
      totalFindings,
      totalAgents,
      agentsOnline,
      activeSessions,
      usersActive24h,
      usersActive7d,
      recentUsers,
      orgs,
      recentScans,
      healthHistory,
      openCritical,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.scan.count(),
      prisma.finding.count(),
      prisma.agent.count(),
      prisma.agent.count({ where: { status: "ONLINE" } }),
      prisma.session.count({ where: { expires: { gt: new Date() } } }),
      prisma.user.count({ where: { updatedAt: { gte: dayAgo } } }),
      prisma.user.count({ where: { updatedAt: { gte: weekAgo } } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          orgs: {
            take: 1,
            select: {
              role: true,
              org: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  subscription: { select: { tier: true, status: true, scansUsedThisMonth: true } },
                },
              },
            },
          },
          sessions: {
            where: { expires: { gt: new Date() } },
            take: 1,
            select: { expires: true },
          },
        },
      }),
      prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          _count: { select: { members: true, scans: true, domains: true, agents: true } },
          subscription: { select: { tier: true, status: true, scansUsedThisMonth: true } },
        },
      }),
      prisma.scan.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          mode: true,
          status: true,
          findingsCount: true,
          createdAt: true,
          completedAt: true,
          domain: { select: { name: true } },
        },
      }),
      getRecentHealthHistory(40),
      prisma.finding.count({ where: { severity: "CRITICAL", status: "OPEN" } }),
    ]);

    const users = recentUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      orgRole: u.orgs[0]?.role ?? null,
      orgName: u.orgs[0]?.org.name ?? null,
      orgSlug: u.orgs[0]?.org.slug ?? null,
      tier: u.orgs[0]?.org.subscription?.tier ?? null,
      subscriptionStatus: u.orgs[0]?.org.subscription?.status ?? null,
      scansUsed: u.orgs[0]?.org.subscription?.scansUsedThisMonth ?? 0,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      isActiveSession: u.sessions.length > 0,
    }));

    const latestHealth = new Map<string, (typeof healthHistory)[0]>();
    for (const row of healthHistory) {
      if (!latestHealth.has(row.serviceName)) latestHealth.set(row.serviceName, row);
    }
    const services = Array.from(latestHealth.values());
    const systemStatus = services.some((s) => s.status === "down")
      ? "down"
      : services.some((s) => s.status === "degraded")
        ? "degraded"
        : services.length
          ? "healthy"
          : "unknown";

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      overview: {
        totalUsers,
        totalOrgs,
        activeSessions,
        usersActive24h,
        usersActive7d,
        totalScans,
        totalFindings,
        openCritical,
        totalAgents,
        agentsOnline,
        systemStatus,
      },
      users,
      orgs,
      recentScans,
      services,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin(request);
    const health = await runSystemTests(null);
    return NextResponse.json({ health });
  } catch (err) {
    return handleApiError(err);
  }
}
