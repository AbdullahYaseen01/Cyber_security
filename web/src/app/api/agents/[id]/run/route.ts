import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiSubscription } from "@/lib/api-auth";
import { runAgent } from "@/lib/agent-engine";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { org } = await requireApiSubscription();
    const { id } = await params;
    const agent = await prisma.agent.findFirst({
      where: { id, orgId: org.orgId },
    });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    const result = await runAgent(agent.id);
    const logs = await prisma.agentLog.findMany({
      where: { agentId: agent.id, executionId: result.executionId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ ...result, logs });
  } catch (err) {
    return handleApiError(err);
  }
}
