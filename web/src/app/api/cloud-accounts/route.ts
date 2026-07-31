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

export async function POST(req: NextRequest) {
  try {
    const { org } = await requireApiSubscription();
    const data = schema.parse(await req.json());
    const account = await prisma.cloudAccount.create({
      data: { orgId: org.orgId, ...data, status: "CONNECTED" },
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
