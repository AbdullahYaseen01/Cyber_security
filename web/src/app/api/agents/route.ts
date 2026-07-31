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
    });
    return NextResponse.json({ agents });
  } catch (err) {
    return handleApiError(err);
  }
}

const schema = z.object({
  name: z.string().min(3).max(50),
  os: z.enum(["Linux", "Windows", "macOS", "Docker", "Kubernetes"]),
});

export async function POST(req: NextRequest) {
  try {
    const { org } = await requireApiSubscription();
    const data = schema.parse(await req.json());
    const agent = await prisma.agent.create({
      data: {
        orgId: org.orgId,
        name: data.name,
        os: data.os,
        hostname: "pending",
        version: "1.0.0",
        status: "OFFLINE",
      },
    });
    return NextResponse.json({ agent }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
