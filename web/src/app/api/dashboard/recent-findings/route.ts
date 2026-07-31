import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiOrg } from "@/lib/api-auth";
import { formatDistanceToNow } from "date-fns";

export async function GET() {
  try {
    const { org } = await requireApiOrg();

    const findings = await prisma.finding.findMany({
      where: {
        orgId: org.orgId,
        severity: { in: ["CRITICAL", "HIGH"] },
        isFalsePositive: false,
      },
      include: { domain: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      findings: findings.map((f) => ({
        id: f.id,
        title: f.title,
        severity: f.severity,
        domain: f.domain.name,
        url: f.url,
        createdAt: f.createdAt,
        timeAgo: formatDistanceToNow(f.createdAt, { addSuffix: true }),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
