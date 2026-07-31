import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiOrg } from "@/lib/api-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { org } = await requireApiOrg();

    const scan = await prisma.scan.findFirst({
      where: { id, orgId: org.orgId },
      include: {
        domain: { select: { name: true } },
        findings: { orderBy: { createdAt: "desc" }, take: 100 },
      },
    });

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    return NextResponse.json({ scan });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { org } = await requireApiOrg();

    await prisma.scan.deleteMany({ where: { id, orgId: org.orgId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
