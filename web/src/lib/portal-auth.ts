import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { SubscriptionTier } from "@prisma/client";
import {
  PORTAL_ACCOUNTS,
  type PortalId,
  type PlatformRole,
  type PortalAccount,
} from "@/lib/portal-accounts";

export type { PortalId, PlatformRole, PortalAccount };
export {
  PORTAL_ACCOUNTS,
  portalAccountFor,
  isPortalLogin,
  homeForPlatformRole,
} from "@/lib/portal-accounts";

export interface ResolvedPortalUser {
  user: { id: string; email: string; name: string | null; image: string | null };
  membership: {
    orgId: string;
    role: string;
    org: {
      subscription: {
        tier: SubscriptionTier;
        status: string;
        scansUsedThisMonth: number;
      } | null;
    };
  };
  platformRole: PlatformRole;
  /** False when the workspace has no domains yet, i.e. fixtures still need seeding. */
  seeded: boolean;
}

/**
 * Warm-lambda cache. Portal accounts are fixed fixtures, so a short TTL avoids
 * repeating the provisioning round trips on every sign-in.
 */
const CACHE_TTL_MS = 10 * 60_000;
const cache = new Map<string, { value: ResolvedPortalUser; expires: number }>();

function readCache(email: string): ResolvedPortalUser | null {
  const hit = cache.get(email);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(email);
    return null;
  }
  return hit.value;
}

function writeCache(email: string, value: ResolvedPortalUser) {
  cache.set(email, { value, expires: Date.now() + CACHE_TTL_MS });
}

export function invalidatePortalCache(email?: string) {
  if (email) cache.delete(email.toLowerCase());
  else cache.clear();
}

/**
 * Resolve a portal fixture account. The happy path is a single database
 * round trip; provisioning only runs when something is actually missing.
 */
export async function ensurePortalUser(portal: PortalId): Promise<ResolvedPortalUser> {
  const account = PORTAL_ACCOUNTS[portal];
  const cacheKey = account.email.toLowerCase();

  const cached = readCache(cacheKey);
  if (cached) return cached;

  const existing = await prisma.user.findUnique({
    where: { email: account.email },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      password: true,
      platformRole: true,
      orgs: {
        take: 1,
        orderBy: { joinedAt: "asc" },
        select: {
          orgId: true,
          role: true,
          org: {
            select: {
              id: true,
              domains: { take: 1, select: { id: true } },
              subscription: {
                select: { tier: true, status: true, scansUsedThisMonth: true },
              },
            },
          },
        },
      },
    },
  });

  const membership = existing?.orgs[0];
  const subscription = membership?.org.subscription;
  const ready =
    existing &&
    existing.password &&
    existing.platformRole === account.platformRole &&
    membership &&
    subscription?.status === "ACTIVE";

  if (ready) {
    const resolved: ResolvedPortalUser = {
      user: {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        image: existing.image,
      },
      membership: {
        orgId: membership.orgId,
        role: membership.role,
        org: { subscription: subscription ?? null },
      },
      platformRole: account.platformRole,
      seeded: membership.org.domains.length > 0,
    };
    writeCache(cacheKey, resolved);
    return resolved;
  }

  const resolved = await provisionPortalUser(account, existing?.id);
  writeCache(cacheKey, resolved);
  return resolved;
}

async function provisionPortalUser(
  account: PortalAccount,
  existingId?: string
): Promise<ResolvedPortalUser> {
  const passwordHash = await bcrypt.hash(account.password, 10);

  const user = existingId
    ? await prisma.user.update({
        where: { id: existingId },
        data: {
          password: passwordHash,
          name: account.name,
          platformRole: account.platformRole,
          approvalStatus: "APPROVED",
        },
        select: { id: true, email: true, name: true, image: true },
      })
    : await prisma.user.create({
        data: {
          email: account.email,
          password: passwordHash,
          name: account.name,
          platformRole: account.platformRole,
          approvalStatus: "APPROVED",
          role: account.orgRole,
        },
        select: { id: true, email: true, name: true, image: true },
      });

  let membership = await prisma.orgMember.findFirst({
    where: { userId: user.id },
    orderBy: { joinedAt: "asc" },
    select: { orgId: true, role: true },
  });

  if (!membership) {
    const org = await prisma.organization.create({
      data: {
        name: account.orgName,
        slug: account.orgSlug,
        ownerId: user.id,
        members: { create: { userId: user.id, role: account.orgRole } },
      },
      select: { id: true },
    });
    membership = { orgId: org.id, role: account.orgRole };
  }

  const subscription = await prisma.subscription.upsert({
    where: { orgId: membership.orgId },
    create: {
      orgId: membership.orgId,
      stripeCustomerId: `portal_${membership.orgId}`,
      status: "ACTIVE",
      tier: "ENTERPRISE",
      scansUsedThisMonth: 0,
    },
    update: { status: "ACTIVE", tier: "ENTERPRISE" },
    select: { tier: true, status: true, scansUsedThisMonth: true },
  });

  return {
    user,
    membership: {
      orgId: membership.orgId,
      role: membership.role,
      org: { subscription },
    },
    platformRole: account.platformRole,
    seeded: false,
  };
}

/** Non-blocking login timestamp; never delays the auth response. */
export function touchLastLogin(userId: string) {
  void prisma.user
    .update({ where: { id: userId }, data: { lastLoginAt: new Date() } })
    .catch(() => undefined);
}
