import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiSubscription } from "@/lib/api-auth";

export async function GET(
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
    const logs = await prisma.agentLog.findMany({
      where: { agentId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ logs: logs.reverse() });
  } catch (err) {
    return handleApiError(err);
  }
}
