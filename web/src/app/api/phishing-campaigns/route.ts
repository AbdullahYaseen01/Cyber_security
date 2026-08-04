import dns from "node:dns/promises";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiSubscription } from "@/lib/api-auth";

export async function GET() {
  try {
    const { org } = await requireApiSubscription();
    const campaigns = await prisma.phishingCampaign.findMany({
      where: { orgId: org.orgId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ campaigns });
  } catch (err) {
    return handleApiError(err);
  }
}

const schema = z.object({
  name: z.string().min(3),
  template: z.string().min(1),
  targets: z.array(z.object({ email: z.string().email(), name: z.string().optional() })).min(1),
});

async function emailDnsRisk(email: string) {
  const domain = email.split("@")[1];
  if (!domain) return { risk: 0, notes: [] as string[] };
  const notes: string[] = [];
  let risk = 0;
  try {
    const mx = await dns.resolveMx(domain);
    if (!mx.length) {
      notes.push("No MX records");
      risk += 40;
    }
  } catch {
    notes.push("MX lookup failed");
    risk += 30;
  }
  try {
    const txt = await dns.resolveTxt(domain);
    const flat = txt.map((t) => t.join("")).join(" ");
    if (!/v=spf1/i.test(flat)) {
      notes.push("Missing SPF");
      risk += 20;
    }
    if (!/_dmarc/i.test(flat) && !flat.includes("DMARC")) {
      // also try _dmarc subdomain
      try {
        const dmarc = await dns.resolveTxt(`_dmarc.${domain}`);
        const d = dmarc.map((t) => t.join("")).join(" ");
        if (!/v=DMARC1/i.test(d)) {
          notes.push("Missing DMARC");
          risk += 25;
        }
      } catch {
        notes.push("Missing DMARC");
        risk += 25;
      }
    }
  } catch {
    notes.push("TXT/SPF lookup incomplete");
    risk += 10;
  }
  return { risk, notes, domain };
}

export async function POST(req: NextRequest) {
  try {
    const { org } = await requireApiSubscription();
    const data = schema.parse(await req.json());

    const analyses = await Promise.all(data.targets.slice(0, 10).map((t) => emailDnsRisk(t.email)));
    const avgRisk = analyses.reduce((s, a) => s + a.risk, 0) / Math.max(analyses.length, 1);

    const campaign = await prisma.phishingCampaign.create({
      data: {
        orgId: org.orgId,
        name: data.name,
        template: data.template,
        targets: data.targets,
        targetCount: data.targets.length,
        status: "ANALYZED",
        config: {
          emailSecurity: analyses,
          avgRisk: Math.round(avgRisk),
          note: "DNS email security analysis (SPF/MX/DMARC) — campaign stored for simulation",
        },
      },
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
