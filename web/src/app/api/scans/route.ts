import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { SCANNER_API_URL } from "@/lib/constants";

export async function GET() {
  try {
    const session = await requireSession();
    const scans = await prisma.scan.findMany({
      where: { orgId: session.orgId },
      orderBy: { startedAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ scans });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const startScanSchema = z.object({
  domain: z.string(),
  mode: z.enum(["LIGHTNING", "STANDARD", "MEGA", "SUPER"]).default("LIGHTNING"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { domain, mode } = startScanSchema.parse(body);

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: session.orgId } });
    if (org.subscriptionStatus !== "ACTIVE" && org.subscriptionStatus !== "TRIALING") {
      return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
    }
    if (org.scansUsedThisMonth >= org.scansLimit) {
      return NextResponse.json({ error: "Monthly scan limit reached" }, { status: 403 });
    }

    const verified = await prisma.domain.findFirst({
      where: { orgId: session.orgId, domain, verificationStatus: "VERIFIED" },
    });
    if (!verified) {
      return NextResponse.json({ error: "Domain must be verified before scanning" }, { status: 403 });
    }

    const scanType = mode === "SUPER" ? "super" : "mega";
    const scannerRes = await fetch(
      `${SCANNER_API_URL}/api/scan?domain=${encodeURIComponent(domain)}&scan_type=${scanType}`,
      { method: "POST" }
    );
    if (!scannerRes.ok) {
      return NextResponse.json({ error: "Scanner backend unavailable" }, { status: 503 });
    }
    const scannerData = await scannerRes.json();

    const scan = await prisma.scan.create({
      data: {
        orgId: session.orgId,
        domainId: verified.id,
        externalScanId: scannerData.scan_id,
        targetDomain: domain,
        mode,
        status: "RUNNING",
      },
    });

    await prisma.organization.update({
      where: { id: session.orgId },
      data: { scansUsedThisMonth: { increment: 1 } },
    });

    return NextResponse.json({ scan, scanner: scannerData });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to start scan" }, { status: 500 });
  }
}
