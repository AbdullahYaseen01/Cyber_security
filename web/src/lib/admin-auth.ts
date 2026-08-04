import { auth } from "@/lib/auth";
import { isDemoUserEmail } from "@/lib/demo-auth";
import { ApiError } from "@/lib/api-auth";

/** Platform ops access: demo user, OWNER/ADMIN role, or Bearer SETUP_SECRET/ADMIN_SECRET. */
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
  const role = session.user.role ?? "";
  const allowList = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const allowed =
    isDemoUserEmail(email) ||
    role === "OWNER" ||
    role === "ADMIN" ||
    allowList.includes(email.toLowerCase());

  if (!allowed) {
    throw new ApiError("Forbidden — platform admin only", 403);
  }

  return { mode: "session" as const, email, userId: session.user.id };
}
