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

    // Sequential / small batches — Supabase pooler uses connection_limit=1
    const totalUsers = await prisma.user.count();
    const totalOrgs = await prisma.organization.count();
    const totalScans = await prisma.scan.count();
    const totalFindings = await prisma.finding.count();
    const totalAgents = await prisma.agent.count();
    const agentsOnline = await prisma.agent.count({ where: { status: "ONLINE" } });
    const activeSessions = await prisma.session.count({ where: { expires: { gt: new Date() } } });
    const usersActive24h = await prisma.user.count({ where: { updatedAt: { gte: dayAgo } } });
    const usersActive7d = await prisma.user.count({ where: { updatedAt: { gte: weekAgo } } });
    const openCritical = await prisma.finding.count({
      where: { severity: "CRITICAL", status: "OPEN" },
    });

    const recentUsers = await prisma.user.findMany({
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
                subscription: {
                  select: { tier: true, status: true, scansUsedThisMonth: true },
                },
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
    });

    const orgs = await prisma.organization.findMany({
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
    });

    const recentScans = await prisma.scan.findMany({
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
    });

    let healthHistory: Awaited<ReturnType<typeof getRecentHealthHistory>> = [];
    try {
      healthHistory = await getRecentHealthHistory(40);
    } catch {
      healthHistory = [];
    }

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
