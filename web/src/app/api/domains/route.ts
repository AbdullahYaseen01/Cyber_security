import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiOrg, requireApiSubscription } from "@/lib/api-auth";
import { isDemoUserEmail } from "@/lib/demo-auth";

const DOMAIN_REGEX =
  /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;

const domainSchema = z.object({
  name: z.string().regex(DOMAIN_REGEX, "Invalid domain URL"),
});

function normalizeDomain(input: string): string {
  return input.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
}

export async function GET() {
  try {
    const { org } = await requireApiOrg();
    const domains = await prisma.domain.findMany({
      where: { orgId: org.orgId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ domains });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, org } = await requireApiSubscription();
    const isDemo = isDemoUserEmail(session.user.email);
    const body = await req.json();
    const { name: rawName } = domainSchema.parse(body);
    const name = normalizeDomain(rawName);

    if (!isDemo) {
      const count = await prisma.domain.count({ where: { orgId: org.orgId } });
      if (count >= org.domainLimit) {
        return NextResponse.json({ error: "Domain limit reached. Upgrade your plan." }, { status: 403 });
      }
    }

    const record = await prisma.domain.create({
      data: {
        orgId: org.orgId,
        name,
        verified: isDemo,
      },
    });

    return NextResponse.json({
      domain: record,
      verification: {
        dns: {
          record: `_quantumshield-verify.${name}`,
          value: `quantumshield-verify=${record.verificationToken}`,
        },
        file: {
          path: `/.well-known/quantumshield-verify`,
          content: record.verificationToken,
        },
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
