import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiSubscription } from "@/lib/api-auth";

export async function GET() {
  try {
    const { org } = await requireApiSubscription();
    const accounts = await prisma.cloudAccount.findMany({
      where: { orgId: org.orgId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ accounts });
  } catch (err) {
    return handleApiError(err);
  }
}

const schema = z.object({
  provider: z.enum(["AWS", "AZURE", "GCP"]),
  name: z.string().min(2),
  accountId: z.string().min(3),
});

function baselineCloudFindings(provider: string, accountId: string) {
  const findings = [
    {
      id: "root-mfa",
      severity: "HIGH",
      title: "Verify root / global admin MFA",
      detail: `Ensure MFA is enforced for privileged identities on ${provider} account ${accountId}`,
    },
    {
      id: "public-storage",
      severity: "CRITICAL",
      title: "Scan for public storage buckets",
      detail: "Public object storage is a common misconfiguration — run a full cloud scan with credentials.",
    },
    {
      id: "open-sg",
      severity: "MEDIUM",
      title: "Review security groups / firewall rules",
      detail: "Check for 0.0.0.0/0 on admin ports (22, 3389, 5432).",
    },
  ];
  return { findings, misconfigCount: findings.length };
}

export async function POST(req: NextRequest) {
  try {
    const { org } = await requireApiSubscription();
    const data = schema.parse(await req.json());
    const baseline = baselineCloudFindings(data.provider, data.accountId);
    const account = await prisma.cloudAccount.create({
      data: {
        orgId: org.orgId,
        ...data,
        status: "CONNECTED",
        lastScannedAt: new Date(),
        findings: baseline.findings,
        misconfigCount: baseline.misconfigCount,
      },
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
