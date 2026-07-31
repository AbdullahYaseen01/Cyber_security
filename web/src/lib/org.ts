import { prisma } from "./db";
import type { SubscriptionStatus, SubscriptionTier, UserRole } from "@prisma/client";
import { getTierLimits } from "./tiers";
import { slugify } from "./utils";

export { slugify };

export interface OrgContext {
  orgId: string;
  userId: string;
  role: UserRole;
  tier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  scansUsed: number;
  scansLimit: number;
  domainLimit: number;
}

export async function getOrgContext(userId: string, orgId?: string): Promise<OrgContext | null> {
  const membership = await prisma.orgMember.findFirst({
    where: orgId ? { userId, orgId } : { userId },
    include: {
      org: { include: { subscription: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  if (!membership) return null;

  const sub = membership.org.subscription;
  const tier = sub?.tier ?? "STARTER";
  const limits = getTierLimits(tier);

  return {
    orgId: membership.orgId,
    userId,
    role: membership.role,
    tier,
    subscriptionStatus: sub?.status ?? "INCOMPLETE",
    scansUsed: sub?.scansUsedThisMonth ?? 0,
    scansLimit: limits.scansPerMonth,
    domainLimit: limits.domains,
  };
}

export async function requireOrgContext(userId: string, orgId?: string): Promise<OrgContext> {
  const ctx = await getOrgContext(userId, orgId);
  if (!ctx) throw new Error("No organization membership");
  return ctx;
}

export async function requireActiveSubscription(userId: string, orgId?: string): Promise<OrgContext> {
  const ctx = await requireOrgContext(userId, orgId);
  if (ctx.subscriptionStatus !== "ACTIVE") {
    throw new Error("Active subscription required");
  }
  return ctx;
}

export async function isSlugAvailable(slug: string, excludeOrgId?: string): Promise<boolean> {
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (!existing) return true;
  return excludeOrgId ? existing.id === excludeOrgId : false;
}
