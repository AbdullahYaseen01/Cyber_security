import type { TierId } from "@/lib/tiers";

export type SessionUserPayload = {
  id: string;
  email: string;
  name: string | null;
  orgId: string | null;
  orgName: string | null;
  role: string;
  tier: string;
  subscriptionStatus: string;
  scansUsed: number;
  scansLimit: number;
  needsOnboarding?: boolean;
  isDemo?: boolean;
  image?: string | null;
};

export async function fetchSessionUser(): Promise<SessionUserPayload | null> {
  const res = await fetch("/api/auth/session", { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user ?? null;
}

/** Poll until NextAuth session is available (fixes demo button race). */
export async function waitForSessionUser(
  maxAttempts = 15,
  delayMs = 120
): Promise<SessionUserPayload | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const user = await fetchSessionUser();
    if (user?.id) return user;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

export function mapSessionToStoreUser(user: SessionUserPayload | null) {
  if (!user?.id || !user.orgId || !user.orgName) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    orgId: user.orgId,
    orgName: user.orgName,
    role: user.role,
    tier: user.tier as TierId,
    subscriptionStatus: user.subscriptionStatus,
    scansUsed: user.scansUsed,
    scansLimit: user.scansLimit,
    isDemo: user.isDemo,
  };
}
