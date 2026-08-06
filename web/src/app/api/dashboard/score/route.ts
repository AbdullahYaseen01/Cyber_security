import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiOrg } from "@/lib/api-auth";

export async function GET() {
  try {
    const { org } = await requireApiOrg();

    const [domains, cloudAccounts, agents, apiEndpoints, complianceTasks, openCritical, openHigh] =
      await Promise.all([
        prisma.domain.findMany({ where: { orgId: org.orgId }, select: { securityScore: true } }),
        prisma.cloudAccount.findMany({
          where: { orgId: org.orgId },
          select: { misconfigCount: true },
        }),
        prisma.agent.findMany({ where: { orgId: org.orgId }, select: { status: true } }),
        prisma.apiEndpoint.findMany({ where: { orgId: org.orgId }, select: { riskScore: true } }),
        prisma.complianceTask.findMany({ where: { orgId: org.orgId }, select: { status: true } }),
        prisma.finding.count({
          where: { orgId: org.orgId, severity: "CRITICAL", status: "OPEN", isFalsePositive: false },
        }),
        prisma.finding.count({
          where: { orgId: org.orgId, severity: "HIGH", status: "OPEN", isFalsePositive: false },
        }),
      ]);

    // Prefer real domain posture when present; never default the UI to a dead "F".
    const domainScore =
      domains.length > 0
        ? domains.reduce((s, d) => s + d.securityScore, 0) / domains.length
        : 72;

    const cloudPenalty = cloudAccounts.reduce((s, c) => s + Math.min(c.misconfigCount * 2, 20), 0);
    const cloudScore =
      cloudAccounts.length > 0 ? Math.max(0, 100 - cloudPenalty) : 78;

    const onlineAgents = agents.filter((a) => a.status === "ONLINE" || a.status === "WARNING").length;
    const agentScore = agents.length > 0 ? (onlineAgents / agents.length) * 100 : 80;

    const avgApiRisk =
      apiEndpoints.length > 0
        ? apiEndpoints.reduce((s, e) => s + e.riskScore, 0) / apiEndpoints.length
        : 35;
    const apiScore = Math.max(0, 100 - avgApiRisk * 0.55);

    const complianceComplete = complianceTasks.filter((t) => t.status === "COMPLETE").length;
    const complianceScore =
      complianceTasks.length > 0
        ? (complianceComplete / complianceTasks.length) * 100
        : 70;

    // Findings surface in the feed — don't crush the grade into F.
    const findingPenalty = Math.min(openCritical * 1.5 + openHigh * 0.5, 12);

    const rawScore =
      domainScore * 0.4 +
      cloudScore * 0.15 +
      agentScore * 0.15 +
      apiScore * 0.15 +
      complianceScore * 0.15 -
      findingPenalty;

    const score = Math.round(Math.max(0, Math.min(100, rawScore)));
    const grade =
      score >= 91
        ? "A+"
        : score >= 85
          ? "A"
          : score >= 78
            ? "B+"
            : score >= 71
              ? "B"
              : score >= 61
                ? "C"
                : score >= 41
                  ? "D"
                  : "F";

    return NextResponse.json({
      score,
      grade,
      breakdown: {
        domainScore: Math.round(domainScore),
        cloudScore: Math.round(cloudScore),
        agentScore: Math.round(agentScore),
        apiScore: Math.round(apiScore),
        complianceScore: Math.round(complianceScore),
        openCritical,
        openHigh,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
