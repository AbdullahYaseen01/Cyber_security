import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiSubscription } from "@/lib/api-auth";

export async function GET() {
  try {
    const { org } = await requireApiSubscription();
    const endpoints = await prisma.apiEndpoint.findMany({
      where: { orgId: org.orgId },
      include: { domain: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ endpoints });
  } catch (err) {
    return handleApiError(err);
  }
}

const schema = z.object({
  domainId: z.string(),
  path: z.string().min(1),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  authType: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { org } = await requireApiSubscription();
    const data = schema.parse(await req.json());

    const domain = await prisma.domain.findFirst({
      where: { id: data.domainId, orgId: org.orgId },
    });
    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    const endpoint = await prisma.apiEndpoint.create({
      data: {
        orgId: org.orgId,
        domainId: data.domainId,
        path: data.path,
        method: data.method,
        authType: data.authType ?? "none",
        riskScore: Math.floor(Math.random() * 40) + 20,
      },
    });
    return NextResponse.json({ endpoint }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
