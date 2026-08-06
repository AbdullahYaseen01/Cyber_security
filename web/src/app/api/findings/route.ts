import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiOrg } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const { org } = await requireApiOrg();
    const { searchParams } = req.nextUrl;
    const scanId = searchParams.get("scanId");
    const severity = searchParams.get("severity");

    const findings = await prisma.finding.findMany({
      where: {
        orgId: org.orgId,
        isFalsePositive: false,
        ...(scanId ? { scanId } : {}),
        ...(severity
          ? { severity: severity as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" }
          : {}),
      },
      include: {
        domain: { select: { name: true } },
        scan: { select: { id: true, mode: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ findings, count: findings.length });
  } catch (err) {
    return handleApiError(err);
  }
}
