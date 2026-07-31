import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireOrgContext, requireActiveSubscription, type OrgContext } from "@/lib/org";
import { isDemoUserEmail } from "@/lib/demo-auth";

export async function getApiSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}

export async function requireApiSession() {
  const session = await getApiSession();
  if (!session) {
    throw new ApiError("Unauthorized", 401);
  }
  return session;
}

export async function requireApiOrg(): Promise<{ session: NonNullable<Awaited<ReturnType<typeof getApiSession>>>; org: OrgContext }> {
  const session = await requireApiSession();
  const org = await requireOrgContext(session.user.id, session.user.orgId ?? undefined);
  return { session, org };
}

export async function requireApiSubscription(): Promise<{
  session: NonNullable<Awaited<ReturnType<typeof getApiSession>>>;
  org: OrgContext;
}> {
  const session = await requireApiSession();

  if (isDemoUserEmail(session.user.email)) {
    const org = await requireOrgContext(session.user.id, session.user.orgId ?? undefined);
    return {
      session,
      org: {
        ...org,
        tier: "ENTERPRISE",
        subscriptionStatus: "ACTIVE",
        scansLimit: 999999,
        domainLimit: 999999,
      },
    };
  }

  const org = await requireActiveSubscription(session.user.id, session.user.orgId ?? undefined);
  return { session, org };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
  }
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("API error:", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
