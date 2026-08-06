import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { getConfigStatus } from "@/lib/env";
import { ensureDemoUser } from "@/lib/demo-auth";
import { ensurePortalUser } from "@/lib/portal-auth";

export const runtime = "nodejs";

/**
 * One-time database setup: push schema + seed demo user.
 * Call with header: Authorization: Bearer <SETUP_SECRET>
 * Or set SETUP_SECRET env var on Vercel and POST once after deploy.
 */
export async function POST(request: Request) {
  const setupSecret = process.env.SETUP_SECRET?.trim();
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!setupSecret || token !== setupSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getConfigStatus();
  if (!config.database) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 400 }
    );
  }

  try {
    // Prefer pooler when direct :5432 is unreachable (common on IPv6-only / restricted networks)
    const dbUrl = process.env.DATABASE_URL;
    execSync("npx prisma db push --accept-data-loss", {
      stdio: "pipe",
      env: {
        ...process.env,
        ...(dbUrl ? { DIRECT_URL: dbUrl } : {}),
      },
    });
    const [client, admin, tester] = await Promise.all([
      ensureDemoUser(),
      ensurePortalUser("admin"),
      ensurePortalUser("tester"),
    ]);

    return NextResponse.json({
      ok: true,
      message: "Database schema pushed and portal accounts ready",
      portals: {
        client: client.user.email,
        admin: admin.user.email,
        tester: tester.user.email,
      },
      orgId: client.membership.orgId,
    });
  } catch (err) {
    console.error("Setup failed:", err);
    return NextResponse.json(
      {
        error: "Setup failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(getConfigStatus());
}
