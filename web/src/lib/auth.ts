import { Prisma } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";
import type { TierId } from "./tiers";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-in-production"
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-in-production"
);

export interface TokenPayload {
  sub: string;
  email: string;
  orgId: string;
  role: string;
  tier: TierId;
}

const ACCESS_TTL = "15m";
const REFRESH_TTL = "7d";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function createAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(ACCESS_SECRET);
}

export async function createRefreshToken(userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sub: userId, sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TTL)
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();
  cookieStore.set("qs_access", accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 });
  cookieStore.set("qs_refresh", refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("qs_access");
  cookieStore.delete("qs_refresh");
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("qs_access")?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}

export async function requireSession(): Promise<TokenPayload> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function buildTokenForUser(userId: string, orgId: string): Promise<{ access: string; refresh: string }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      memberships: { where: { orgId }, include: { org: true } },
    },
  });

  const membership = user.memberships[0];
  if (!membership) throw new Error("No organization membership");

  const session = await prisma.session.create({
    data: {
      userId,
      refreshToken: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const payload: TokenPayload = {
    sub: userId,
    email: user.email,
    orgId,
    role: membership.role,
    tier: membership.org.subscriptionTier as TierId,
  };

  const access = await createAccessToken(payload);
  const refresh = await createRefreshToken(userId, session.id);
  return { access, refresh };
}

export async function logAudit(
  action: string,
  opts: { userId?: string; orgId?: string; details?: Record<string, unknown>; ipAddress?: string }
) {
  await prisma.auditLog.create({
    data: {
      action,
      userId: opts.userId,
      orgId: opts.orgId,
      details: (opts.details ?? {}) as Prisma.InputJsonValue,
      ipAddress: opts.ipAddress,
    },
  });
}
