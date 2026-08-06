import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, ApiError } from "@/lib/api-auth";

/** Activate FREE tier without Stripe — 1 domain, 1 scan/month. */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401);

    const membership = await prisma.orgMember.findFirst({
      where: { userId: session.user.id },
      orderBy: { joinedAt: "asc" },
      select: { orgId: true },
    });
    if (!membership) throw new ApiError("Create an organization first", 400);

    const subscription = await prisma.subscription.upsert({
      where: { orgId: membership.orgId },
      create: {
        orgId: membership.orgId,
        stripeCustomerId: `free_${membership.orgId}`,
        status: "ACTIVE",
        tier: "FREE",
        scansUsedThisMonth: 0,
      },
      update: {
        status: "ACTIVE",
        tier: "FREE",
      },
    });

    return NextResponse.json({
      ok: true,
      tier: subscription.tier,
      status: subscription.status,
      message: "Free plan activated — 1 domain and 1 scan per month.",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
