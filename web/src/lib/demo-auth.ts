import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { SubscriptionTier } from "@prisma/client";

export const DEMO_CREDENTIALS = {
  email: "demo@quantumshield.io",
  password: "Demo1234!",
  name: "Demo User",
  orgName: "QuantumShield Demo",
} as const;

export function isDemoLogin(email: string, password: string): boolean {
  return (
    email.toLowerCase() === DEMO_CREDENTIALS.email &&
    password === DEMO_CREDENTIALS.password
  );
}

export function isDemoUserEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === DEMO_CREDENTIALS.email;
}

export function isDemoUser(
  user: { email?: string; isDemo?: boolean } | null | undefined
): boolean {
  if (!user) return false;
  return Boolean(user.isDemo) || isDemoUserEmail(user.email);
}

async function ensureDemoSubscription(orgId: string) {
  await prisma.subscription.upsert({
    where: { orgId },
    create: {
      orgId,
      stripeCustomerId: `demo_${orgId}`,
      status: "ACTIVE",
      tier: "ENTERPRISE",
      scansUsedThisMonth: 0,
    },
    update: {
      status: "ACTIVE",
      tier: "ENTERPRISE",
    },
  });
}

export async function ensureDemoUser() {
  const passwordHash = await bcrypt.hash(DEMO_CREDENTIALS.password, 12);

  let user = await prisma.user.findUnique({
    where: { email: DEMO_CREDENTIALS.email },
    include: { orgs: { include: { org: { include: { subscription: true } } } } },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEMO_CREDENTIALS.email,
        password: passwordHash,
        name: DEMO_CREDENTIALS.name,
      },
      include: { orgs: { include: { org: { include: { subscription: true } } } } },
    });
  } else if (!user.password) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash },
      include: { orgs: { include: { org: { include: { subscription: true } } } } },
    });
  } else {
    const valid = await bcrypt.compare(DEMO_CREDENTIALS.password, user.password);
    if (!valid) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { password: passwordHash },
        include: { orgs: { include: { org: { include: { subscription: true } } } } },
      });
    }
  }

  let membership = user.orgs[0];

  if (!membership) {
    const org = await prisma.organization.create({
      data: {
        name: DEMO_CREDENTIALS.orgName,
        slug: "quantumshield-demo",
        ownerId: user.id,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });
    await ensureDemoSubscription(org.id);
    membership = await prisma.orgMember.findFirstOrThrow({
      where: { userId: user.id, orgId: org.id },
      include: { org: { include: { subscription: true } } },
    });
  } else {
    await ensureDemoSubscription(membership.orgId);
    membership = await prisma.orgMember.findFirstOrThrow({
      where: { id: membership.id },
      include: { org: { include: { subscription: true } } },
    });
  }

  return { user, membership };
}

export function demoOrgContext(membership: {
  orgId: string;
  role: string;
  org: { subscription: { tier: SubscriptionTier; status: string; scansUsedThisMonth: number } | null };
}) {
  return {
    orgId: membership.orgId,
    role: membership.role,
    tier: "ENTERPRISE" as SubscriptionTier,
    subscriptionStatus: "ACTIVE" as const,
    scansUsed: membership.org.subscription?.scansUsedThisMonth ?? 0,
    scansLimit: 999999,
    domainLimit: 999999,
  };
}
