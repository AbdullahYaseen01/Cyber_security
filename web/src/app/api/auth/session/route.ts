import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTierLimits } from "@/lib/tiers";
import { isDemoUserEmail } from "@/lib/demo-auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ user: null });
  }

  const membership = session.user.orgId
    ? await prisma.orgMember.findUnique({
        where: {
          orgId_userId: { orgId: session.user.orgId, userId: session.user.id },
        },
        include: {
          org: { include: { subscription: true } },
        },
      })
    : await prisma.orgMember.findFirst({
        where: { userId: session.user.id },
        include: { org: { include: { subscription: true } } },
      });

  if (!membership) {
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        orgId: null,
        orgName: null,
        role: session.user.role,
        tier: session.user.tier,
        subscriptionStatus: session.user.subscriptionStatus,
        scansUsed: 0,
        scansLimit: 0,
        needsOnboarding: true,
      },
    });
  }

  const sub = membership.org.subscription;
  const isDemo = isDemoUserEmail(session.user.email);
  const tier = isDemo ? "ENTERPRISE" : (sub?.tier ?? "STARTER");
  const limits = getTierLimits(tier);

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      orgId: membership.orgId,
      orgName: membership.org.name,
      role: membership.role,
      tier,
      subscriptionStatus: isDemo ? "ACTIVE" : (sub?.status ?? "INCOMPLETE"),
      scansUsed: sub?.scansUsedThisMonth ?? 0,
      scansLimit: isDemo ? 999 : limits.scansPerMonth,
      needsOnboarding: false,
      isDemo,
    },
  });
}
