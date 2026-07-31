import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiOrg } from "@/lib/api-auth";
import { canAccessModule } from "@/lib/tiers";

const MODULES = [
  { id: "scanner", label: "Scanner", tierKey: "scanner" },
  { id: "api", label: "API Security", tierKey: "api" },
  { id: "agents", label: "Agent Security", tierKey: "agents" },
  { id: "cloud", label: "Cloud Guard", tierKey: "cloud" },
  { id: "phishing", label: "Phishing", tierKey: "phishing" },
  { id: "darkweb", label: "Dark Web", tierKey: "darkweb" },
  { id: "compliance", label: "Compliance", tierKey: "compliance" },
  { id: "reports", label: "Reports", tierKey: "reports" },
] as const;

export async function GET() {
  try {
    const { org } = await requireApiOrg();

    const [domains, apiEndpoints, agents, cloudAccounts, campaigns, alerts, tasks] =
      await Promise.all([
        prisma.domain.findMany({ where: { orgId: org.orgId }, select: { securityScore: true } }),
        prisma.apiEndpoint.findMany({ where: { orgId: org.orgId }, select: { riskScore: true } }),
        prisma.agent.findMany({ where: { orgId: org.orgId }, select: { status: true } }),
        prisma.cloudAccount.findMany({
          where: { orgId: org.orgId },
          select: { misconfigCount: true },
        }),
        prisma.phishingCampaign.count({ where: { orgId: org.orgId, status: "COMPLETED" } }),
        prisma.darkWebAlert.count({ where: { orgId: org.orgId, status: "NEW" } }),
        prisma.complianceTask.findMany({ where: { orgId: org.orgId }, select: { status: true } }),
      ]);

    const domainAvg =
      domains.length > 0 ? domains.reduce((s, d) => s + d.securityScore, 0) / domains.length : 0;
    const apiScore =
      apiEndpoints.length > 0
        ? 100 - apiEndpoints.reduce((s, e) => s + e.riskScore, 0) / apiEndpoints.length
        : 0;
    const onlineAgents = agents.filter((a) => a.status === "ONLINE").length;
    const agentScore = agents.length > 0 ? (onlineAgents / agents.length) * 100 : 0;
    const cloudPenalty = cloudAccounts.reduce((s, c) => s + c.misconfigCount, 0);
    const cloudScore = Math.max(0, 100 - cloudPenalty * 5);
    const phishingScore = campaigns > 0 ? 70 : 0;
    const darkWebScore = Math.max(0, 100 - alerts * 10);
    const complianceComplete = tasks.filter((t) => t.status === "COMPLETE").length;
    const complianceScore = tasks.length > 0 ? (complianceComplete / tasks.length) * 100 : 0;

    const scores: Record<string, number> = {
      scanner: Math.round(domainAvg),
      api: Math.round(apiScore),
      agents: Math.round(agentScore),
      cloud: Math.round(cloudScore),
      phishing: Math.round(phishingScore),
      darkweb: Math.round(darkWebScore),
      compliance: Math.round(complianceScore),
      reports: Math.round((domainAvg + complianceScore) / 2),
    };

    const modules = MODULES.map((m) => {
      const score = scores[m.id] ?? 0;
      const locked = !canAccessModule(org.tier, m.id);
      const status = locked ? "locked" : score >= 70 ? "healthy" : score >= 40 ? "warning" : "critical";
      return { ...m, score, locked, status };
    });

    return NextResponse.json({ modules });
  } catch (err) {
    return handleApiError(err);
  }
}
