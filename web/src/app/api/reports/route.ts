import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiSubscription } from "@/lib/api-auth";

export async function GET() {
  try {
    const { org } = await requireApiSubscription();
    const reports = await prisma.report.findMany({
      where: { orgId: org.orgId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ reports });
  } catch (err) {
    return handleApiError(err);
  }
}

const schema = z.object({
  title: z.string().min(3),
  type: z.enum([
    "EXECUTIVE_SUMMARY",
    "TECHNICAL_VULNERABILITY",
    "COMPLIANCE_STATUS",
    "API_SECURITY",
    "CLOUD_MISCONFIG",
    "AGENT_HEALTH",
    "PHISHING_RESULTS",
    "DARK_WEB_EXPOSURE",
  ]),
  format: z.enum(["HTML", "PDF", "JSON"]).default("HTML"),
});

export async function POST(req: NextRequest) {
  try {
    const { session, org } = await requireApiSubscription();
    const data = schema.parse(await req.json());

    const findings = await prisma.finding.count({ where: { orgId: org.orgId } });
    const content = `# ${data.title}\n\nGenerated report for ${org.orgId}\n\nTotal findings: ${findings}\nReport type: ${data.type}`;

    const report = await prisma.report.create({
      data: {
        orgId: org.orgId,
        userId: session.user.id,
        title: data.title,
        type: data.type,
        format: data.format,
        content,
        status: "GENERATED",
      },
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
