import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const domainSchema = z.object({
  domain: z.string().regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/),
});

export async function GET() {
  try {
    const session = await requireSession();
    const domains = await prisma.domain.findMany({
      where: { orgId: session.orgId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ domains });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { domain } = domainSchema.parse(body);

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: session.orgId } });
    const count = await prisma.domain.count({ where: { orgId: session.orgId } });
    if (count >= org.domainLimit) {
      return NextResponse.json({ error: "Domain limit reached. Upgrade your plan." }, { status: 403 });
    }

    const record = await prisma.domain.upsert({
      where: { orgId_domain: { orgId: session.orgId, domain } },
      create: { orgId: session.orgId, domain },
      update: {},
    });

    return NextResponse.json({
      domain: record,
      verification: {
        method: "dns_txt",
        record: `_quantumshield-verify.${domain}`,
        value: `quantumshield-verify=${record.verificationToken}`,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
