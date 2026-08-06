import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiOrg } from "@/lib/api-auth";
import { deliverScanReport } from "@/lib/scan-report";

/** Re-send / generate report for a completed scan. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { org } = await requireApiOrg();
    const body = await req.json().catch(() => ({}));
    const email =
      typeof body?.email === "string" && body.email.trim()
        ? body.email.trim()
        : undefined;

    const scan = await prisma.scan.findFirst({
      where: { id, orgId: org.orgId },
      select: { id: true, status: true, config: true },
    });
    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }
    if (scan.status !== "COMPLETED" && scan.status !== "STOPPED") {
      return NextResponse.json({ error: "Scan is not finished yet" }, { status: 400 });
    }

    if (email) {
      const config = (scan.config ?? {}) as Record<string, unknown>;
      await prisma.scan.update({
        where: { id },
        data: {
          config: {
            ...config,
            reportEmail: email,
            reportDeliveredAt: null,
          },
        },
      });
    } else {
      // Force re-delivery of existing email if present
      const config = (scan.config ?? {}) as Record<string, unknown>;
      await prisma.scan.update({
        where: { id },
        data: {
          config: {
            ...config,
            reportDeliveredAt: null,
          },
        },
      });
    }

    const result = await deliverScanReport(id);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
