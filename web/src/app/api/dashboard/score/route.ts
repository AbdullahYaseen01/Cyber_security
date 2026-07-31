import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiOrg } from "@/lib/api-auth";

export async function GET() {
  try {
    const { org } = await requireApiOrg();

    const [domains, cloudAccounts, agents, apiEndpoints, complianceTasks, findings] =
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
          where: { orgId: org.orgId, severity: { in: ["CRITICAL", "HIGH"] }, status: "OPEN" },
        }),
      ]);

    const domainScore =
      domains.length > 0
        ? domains.reduce((s, d) => s + d.securityScore, 0) / domains.length
        : 50;

    const cloudPenalty = cloudAccounts.reduce((s, c) => s + Math.min(c.misconfigCount * 2, 30), 0);
    const cloudScore = Math.max(0, 100 - cloudPenalty);

    const onlineAgents = agents.filter((a) => a.status === "ONLINE").length;
    const agentScore = agents.length > 0 ? (onlineAgents / agents.length) * 100 : 75;

    const apiScore =
      apiEndpoints.length > 0
        ? 100 -
          apiEndpoints.reduce((s, e) => s + e.riskScore, 0) / apiEndpoints.length
        : 80;

    const complianceComplete = complianceTasks.filter((t) => t.status === "COMPLETE").length;
    const complianceScore =
      complianceTasks.length > 0 ? (complianceComplete / complianceTasks.length) * 100 : 0;

    const findingPenalty = Math.min(findings * 3, 40);
    const rawScore =
      domainScore * 0.35 +
      cloudScore * 0.2 +
      agentScore * 0.15 +
      apiScore * 0.15 +
      complianceScore * 0.15 -
      findingPenalty;

    const score = Math.round(Math.max(0, Math.min(100, rawScore)));
    const grade =
      score >= 91 ? "A+" : score >= 81 ? "A" : score >= 71 ? "B" : score >= 61 ? "C" : score >= 41 ? "D" : "F";

    return NextResponse.json({ score, grade });
  } catch (err) {
    return handleApiError(err);
  }
}
