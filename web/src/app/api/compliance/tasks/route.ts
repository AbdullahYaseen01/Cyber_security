import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiSubscription } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const { org } = await requireApiSubscription();
    const framework = req.nextUrl.searchParams.get("framework");
    const tasks = await prisma.complianceTask.findMany({
      where: {
        orgId: org.orgId,
        ...(framework ? { framework } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ tasks });
  } catch (err) {
    return handleApiError(err);
  }
}

const schema = z.object({
  framework: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const { org } = await requireApiSubscription();
    const { framework } = schema.parse(await req.json());

    const existing = await prisma.complianceTask.count({
      where: { orgId: org.orgId, framework },
    });
    if (existing > 0) {
      return NextResponse.json({ error: "Framework already activated" }, { status: 409 });
    }

    const controls = FRAMEWORK_CONTROLS[framework] ?? [];
    await prisma.complianceTask.createMany({
      data: controls.map((c) => ({
        orgId: org.orgId,
        framework,
        controlId: c.id,
        controlName: c.name,
        description: c.description,
      })),
    });

    const tasks = await prisma.complianceTask.findMany({
      where: { orgId: org.orgId, framework },
    });
    return NextResponse.json({ tasks }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

const FRAMEWORK_CONTROLS: Record<string, { id: string; name: string; description: string }[]> = {
  ISO27001: [
    { id: "A.5.1", name: "Information Security Policies", description: "Define and review security policies" },
    { id: "A.8.1", name: "Asset Inventory", description: "Identify and manage information assets" },
    { id: "A.12.6", name: "Vulnerability Management", description: "Manage technical vulnerabilities" },
  ],
  SOC2: [
    { id: "CC6.1", name: "Logical Access", description: "Restrict logical access to systems" },
    { id: "CC7.2", name: "System Monitoring", description: "Monitor system components" },
    { id: "CC8.1", name: "Change Management", description: "Authorize and document changes" },
  ],
  GDPR: [
    { id: "Art.5", name: "Data Processing Principles", description: "Lawful, fair, transparent processing" },
    { id: "Art.32", name: "Security of Processing", description: "Appropriate technical measures" },
    { id: "Art.33", name: "Breach Notification", description: "Notify authorities within 72 hours" },
  ],
};
