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
        ...(severity ? { severity: severity as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" } : {}),
      },
      include: { domain: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ findings });
  } catch (err) {
    return handleApiError(err);
  }
}
