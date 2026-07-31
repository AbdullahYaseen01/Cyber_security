import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiOrg } from "@/lib/api-auth";
import { subDays, startOfDay, format } from "date-fns";

export async function GET() {
  try {
    const { org } = await requireApiOrg();
    const start = subDays(new Date(), 90);

    const scans = await prisma.scan.findMany({
      where: { orgId: org.orgId, createdAt: { gte: start } },
      select: { createdAt: true },
    });

    const byDay: Record<string, number> = {};
    for (let i = 0; i < 90; i++) {
      const day = format(startOfDay(subDays(new Date(), 89 - i)), "yyyy-MM-dd");
      byDay[day] = 0;
    }

    for (const scan of scans) {
      const day = format(startOfDay(scan.createdAt), "yyyy-MM-dd");
      if (day in byDay) byDay[day]++;
    }

    const activity = Object.entries(byDay).map(([date, count]) => ({ date, count }));

    return NextResponse.json({ activity });
  } catch (err) {
    return handleApiError(err);
  }
}
