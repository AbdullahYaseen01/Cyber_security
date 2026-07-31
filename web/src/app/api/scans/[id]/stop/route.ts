import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiOrg } from "@/lib/api-auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { org } = await requireApiOrg();

    const scan = await prisma.scan.findFirst({
      where: { id, orgId: org.orgId, status: "RUNNING" },
    });

    if (!scan) {
      return NextResponse.json({ error: "Scan not found or not running" }, { status: 404 });
    }

    const updated = await prisma.scan.update({
      where: { id },
      data: { status: "STOPPED" },
    });

    return NextResponse.json({ scan: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
