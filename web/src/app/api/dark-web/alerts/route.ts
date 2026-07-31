import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiSubscription } from "@/lib/api-auth";

export async function GET() {
  try {
    const { org } = await requireApiSubscription();
    const alerts = await prisma.darkWebAlert.findMany({
      where: { orgId: org.orgId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ alerts });
  } catch (err) {
    return handleApiError(err);
  }
}
