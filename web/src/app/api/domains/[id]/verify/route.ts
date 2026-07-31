import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiOrg } from "@/lib/api-auth";
import dns from "dns/promises";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { org } = await requireApiOrg();

    const domain = await prisma.domain.findFirst({
      where: { id, orgId: org.orgId },
    });
    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    let verified = false;

    try {
      const records = await dns.resolveTxt(`_quantumshield-verify.${domain.name}`);
      const flat = records.flat();
      verified = flat.some((r) => r.includes(domain.verificationToken));
    } catch {
      // DNS lookup failed — try HTTP
    }

    if (!verified) {
      try {
        const res = await fetch(`https://${domain.name}/.well-known/quantumshield-verify`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const text = await res.text();
          verified = text.trim() === domain.verificationToken;
        }
      } catch {
        // HTTP verification failed
      }
    }

    const updated = await prisma.domain.update({
      where: { id },
      data: { verified },
    });

    return NextResponse.json({
      domain: updated,
      verified,
      message: verified ? "Domain verified successfully" : "Verification failed. Check DNS or file.",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
