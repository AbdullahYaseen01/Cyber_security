import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const membership = await prisma.orgMember.findFirst({
      where: { userId: session.sub, orgId: session.orgId },
      include: { org: true, user: true },
    });

    if (!membership) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name,
        orgId: membership.org.id,
        orgName: membership.org.name,
        role: membership.role,
        tier: membership.org.subscriptionTier,
        subscriptionStatus: membership.org.subscriptionStatus,
        scansUsed: membership.org.scansUsedThisMonth,
        scansLimit: membership.org.scansLimit,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
