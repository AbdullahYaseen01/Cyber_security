import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiSubscription } from "@/lib/api-auth";
import { getScanModeTier } from "@/lib/feature-gates";
import { canUseScanMode } from "@/lib/tiers";
import { startScanSimulation } from "@/lib/scan-engine";
import { isDemoUserEmail } from "@/lib/demo-auth";

export async function GET() {
  try {
    const { org } = await requireApiSubscription();
    const scans = await prisma.scan.findMany({
      where: { orgId: org.orgId },
      include: { domain: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ scans });
  } catch (err) {
    return handleApiError(err);
  }
}

const startScanSchema = z.object({
  domainId: z.string(),
  mode: z.enum(["LIGHTNING", "STANDARD", "MEGA", "SUPER"]).default("LIGHTNING"),
  config: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, org } = await requireApiSubscription();
    const body = await req.json();
    const data = startScanSchema.parse(body);
    const isDemo = isDemoUserEmail(session.user.email);

    const requiredTier = getScanModeTier(data.mode);
    if (!canUseScanMode(org.tier, requiredTier, { isDemo })) {
      return NextResponse.json(
        { error: `${data.mode} scans require ${requiredTier} plan or higher` },
        { status: 403 }
      );
    }

    if (!isDemo && org.scansUsed >= org.scansLimit) {
      return NextResponse.json({ error: "Monthly scan limit reached" }, { status: 403 });
    }

    const domain = await prisma.domain.findFirst({
      where: {
        id: data.domainId,
        orgId: org.orgId,
        ...(isDemo ? {} : { verified: true }),
      },
    });
    if (!domain) {
      return NextResponse.json({ error: "Domain not found or not verified" }, { status: 403 });
    }

    const fuzzTotal = data.mode === "MEGA" || data.mode === "SUPER" ? 1_000_000 : 100_000;

    const scan = await prisma.scan.create({
      data: {
        orgId: org.orgId,
        domainId: domain.id,
        userId: session.user.id,
        mode: data.mode,
        status: "PENDING",
        config: (data.config ?? {}) as Prisma.InputJsonValue,
        fuzzTotal,
      },
      include: { domain: { select: { name: true } } },
    });

    startScanSimulation(scan.id).catch(console.error);

    return NextResponse.json({ scanId: scan.id, scan });
  } catch (err) {
    return handleApiError(err);
  }
}
