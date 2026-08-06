import { auth } from "@/lib/auth";
import { portalAccountFor } from "@/lib/portal-accounts";
import { ApiError } from "@/lib/api-auth";

/** Platform ops access: platformRole ADMIN, admin portal email, allow-list, or Bearer secret. */
export async function requirePlatformAdmin(request?: Request) {
  const secret =
    process.env.ADMIN_SECRET?.trim() ||
    process.env.SETUP_SECRET?.trim() ||
    "";

  if (request && secret) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (token && token === secret) {
      return { mode: "secret" as const, email: "ops@system" };
    }
  }

  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError("Unauthorized", 401);
  }

  const email = session.user.email ?? "";
  const platformRole = session.user.platformRole ?? "CLIENT";
  const allowList = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const portal = portalAccountFor(email);
  const allowed =
    platformRole === "ADMIN" ||
    portal?.platformRole === "ADMIN" ||
    allowList.includes(email.toLowerCase());

  if (!allowed) {
    throw new ApiError("Forbidden — platform admin only", 403);
  }

  return { mode: "session" as const, email, userId: session.user.id };
}

export async function requireTesterOrAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError("Unauthorized", 401);
  }

  const email = session.user.email ?? "";
  const platformRole = session.user.platformRole ?? "CLIENT";
  const portal = portalAccountFor(email);

  const allowed =
    platformRole === "TESTER" ||
    platformRole === "ADMIN" ||
    portal?.platformRole === "TESTER" ||
    portal?.platformRole === "ADMIN";

  if (!allowed) {
    throw new ApiError("Forbidden — tester or admin only", 403);
  }

  return { email, userId: session.user.id, platformRole };
}
