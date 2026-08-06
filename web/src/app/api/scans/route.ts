import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiSubscription } from "@/lib/api-auth";
import { getScanModeTier } from "@/lib/feature-gates";
import { canUseScanMode } from "@/lib/tiers";
import { startScanSimulation } from "@/lib/scan-engine";
import { isDemoUserEmail } from "@/lib/demo-auth";

function normalizeDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .toLowerCase();
}

export async function GET(req: NextRequest) {
  try {
    const { session, org } = await requireApiSubscription();
    const mine = req.nextUrl.searchParams.get("mine") === "1";

    const scans = await prisma.scan.findMany({
      where: {
        orgId: org.orgId,
        ...(mine ? { userId: session.user.id } : {}),
      },
      include: {
        domain: { select: { name: true } },
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ scans, mine });
  } catch (err) {
    return handleApiError(err);
  }
}

const startScanSchema = z
  .object({
    domainId: z.string().optional(),
    domain: z.string().min(3).optional(),
    email: z
      .union([z.string().email(), z.literal("")])
      .optional()
      .transform((v) => (v && v.trim() ? v.trim() : undefined)),
    mode: z.enum(["LIGHTNING", "STANDARD", "MEGA", "SUPER"]).default("LIGHTNING"),
    config: z.record(z.unknown()).optional(),
  })
  .refine((d) => Boolean(d.domainId || d.domain), {
    message: "Domain is required",
    path: ["domain"],
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

    let domain =
      data.domainId
        ? await prisma.domain.findFirst({
            where: { id: data.domainId, orgId: org.orgId },
          })
        : null;

    if (!domain && data.domain) {
      const name = normalizeDomain(data.domain);
      domain = await prisma.domain.upsert({
        where: { orgId_name: { orgId: org.orgId, name } },
        create: {
          orgId: org.orgId,
          name,
          verified: true,
        },
        update: { verified: true },
      });
    }

    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 403 });
    }

    if (!domain.verified) {
      domain = await prisma.domain.update({
        where: { id: domain.id },
        data: { verified: true },
      });
    }

    const fuzzTotal = data.mode === "MEGA" || data.mode === "SUPER" ? 1_000_000 : 100_000;
    // Email is optional — only attach when the user explicitly provided one.
    const reportEmail = data.email;

    const scan = await prisma.scan.create({
      data: {
        orgId: org.orgId,
        domainId: domain.id,
        userId: session.user.id,
        mode: data.mode,
        status: "PENDING",
        config: {
          ...(data.config ?? {}),
          ...(reportEmail ? { reportEmail } : {}),
        } as Prisma.InputJsonValue,
        fuzzTotal,
      },
      include: { domain: { select: { name: true } } },
    });

    void startScanSimulation(scan.id).catch(console.error);

    return NextResponse.json({
      scanId: scan.id,
      scan,
      reportEmail: reportEmail ?? null,
      message: reportEmail
        ? "Scan started. A report will be emailed when it finishes."
        : "Scan started. View progress and findings in your history.",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
