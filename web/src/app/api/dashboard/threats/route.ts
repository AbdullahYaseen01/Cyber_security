import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiOrg } from "@/lib/api-auth";
import type { Severity } from "@prisma/client";
import { subDays } from "date-fns";

const SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export async function GET() {
  try {
    const { org } = await requireApiOrg();
    const now = new Date();
    const weekAgo = subDays(now, 7);
    const twoWeeksAgo = subDays(now, 14);

    const counts = await Promise.all(
      SEVERITIES.map(async (severity) => {
        const [current, previous] = await Promise.all([
          prisma.finding.count({
            where: {
              orgId: org.orgId,
              severity,
              status: "OPEN",
              createdAt: { gte: weekAgo },
            },
          }),
          prisma.finding.count({
            where: {
              orgId: org.orgId,
              severity,
              status: "OPEN",
              createdAt: { gte: twoWeeksAgo, lt: weekAgo },
            },
          }),
        ]);
        return { severity, count: current, trend: current - previous };
      })
    );

    return NextResponse.json({ threats: counts });
  } catch (err) {
    return handleApiError(err);
  }
}
