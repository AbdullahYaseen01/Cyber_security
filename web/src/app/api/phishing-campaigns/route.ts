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

export async function POST(req: NextRequest) {
  try {
    const { org } = await requireApiSubscription();
    const data = schema.parse(await req.json());
    const campaign = await prisma.phishingCampaign.create({
      data: {
        orgId: org.orgId,
        name: data.name,
        template: data.template,
        targets: data.targets,
        targetCount: data.targets.length,
        status: "DRAFT",
      },
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
