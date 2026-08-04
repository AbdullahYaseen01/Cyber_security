import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiSubscription } from "@/lib/api-auth";

export async function GET() {
  try {
    const { org } = await requireApiSubscription();
    const agents = await prisma.agent.findMany({
      where: { orgId: org.orgId },
      orderBy: { createdAt: "desc" },
      include: {
        logs: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    });
    return NextResponse.json({ agents });
  } catch (err) {
    return handleApiError(err);
  }
}

const schema = z.object({
  name: z.string().min(2).max(50),
  os: z.enum(["Linux", "Windows", "macOS", "Docker", "Kubernetes"]).default("Linux"),
  agentType: z.enum(["monitor", "responder", "hunter", "compliance"]).default("monitor"),
  targetUrl: z.string().url().optional().or(z.literal("")),
  cronSchedule: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { org } = await requireApiSubscription();
    const data = schema.parse(await req.json());
    let hostname = "pending";
    if (data.targetUrl) {
      try {
        hostname = new URL(data.targetUrl).hostname;
      } catch {
        hostname = data.name;
      }
    }
    const agent = await prisma.agent.create({
      data: {
        orgId: org.orgId,
        name: data.name,
        os: data.os,
        hostname,
        version: "2.0.0",
        agentType: data.agentType,
        targetUrl: data.targetUrl || null,
        cronSchedule: data.cronSchedule || "*/5 * * * *",
        status: "OFFLINE",
        config: { targetUrl: data.targetUrl || null },
      },
    });
    return NextResponse.json({ agent }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
