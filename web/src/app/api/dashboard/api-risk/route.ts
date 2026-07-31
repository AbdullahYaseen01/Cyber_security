import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiOrg } from "@/lib/api-auth";

const BUCKETS = [
  { label: "0-20", min: 0, max: 20 },
  { label: "21-40", min: 21, max: 40 },
  { label: "41-60", min: 41, max: 60 },
  { label: "61-80", min: 61, max: 80 },
  { label: "81-100", min: 81, max: 100 },
];

export async function GET() {
  try {
    const { org } = await requireApiOrg();

    const endpoints = await prisma.apiEndpoint.findMany({
      where: { orgId: org.orgId },
      select: { riskScore: true },
    });

    const distribution = BUCKETS.map((bucket) => ({
      bucket: bucket.label,
      count: endpoints.filter((e) => e.riskScore >= bucket.min && e.riskScore <= bucket.max).length,
    }));

    return NextResponse.json({ distribution });
  } catch (err) {
    return handleApiError(err);
  }
}
