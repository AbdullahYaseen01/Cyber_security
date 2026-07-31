import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiSubscription } from "@/lib/api-auth";

export async function GET() {
  try {
    const { org } = await requireApiSubscription();
    const config = await prisma.darkWebMonitor.findUnique({ where: { orgId: org.orgId } });
    return NextResponse.json({ config });
  } catch (err) {
    return handleApiError(err);
  }
}

const schema = z.object({
  monitoredEmails: z.array(z.string().email()),
  keywords: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  try {
    const { org } = await requireApiSubscription();
    const data = schema.parse(await req.json());
    const config = await prisma.darkWebMonitor.upsert({
      where: { orgId: org.orgId },
      create: {
        orgId: org.orgId,
        monitoredEmails: data.monitoredEmails,
        keywords: data.keywords,
      },
      update: {
        monitoredEmails: data.monitoredEmails,
        keywords: data.keywords,
      },
    });
    return NextResponse.json({ config });
  } catch (err) {
    return handleApiError(err);
  }
}
