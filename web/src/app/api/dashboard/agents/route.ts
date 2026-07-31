import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiOrg } from "@/lib/api-auth";

export async function GET() {
  try {
    const { org } = await requireApiOrg();

    const agents = await prisma.agent.findMany({
      where: { orgId: org.orgId },
      select: { status: true },
    });

    const counts = {
      ONLINE: 0,
      OFFLINE: 0,
      WARNING: 0,
      QUARANTINED: 0,
    };

    for (const agent of agents) {
      counts[agent.status]++;
    }

    return NextResponse.json({
      agents: counts,
      total: agents.length,
      online: counts.ONLINE,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
