import { NextResponse } from "next/server";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { ensureDemoUser } from "@/lib/demo-auth";
import {
  ensurePortalUser,
  PORTAL_ACCOUNTS,
  type PortalId,
} from "@/lib/portal-auth";
import { getConfigStatus } from "@/lib/env";
import { getRequestOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";

function isPortalId(value: string | null): value is PortalId {
  return value === "client" || value === "admin" || value === "tester";
}

function loginRedirect(origin: string, error: string, portal: PortalId) {
  const path =
    portal === "admin" ? "/admin/login" : portal === "tester" ? "/tester/login" : "/login";
  return NextResponse.redirect(new URL(`${path}?error=${error}`, origin));
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function isDatabaseConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  const msg = formatError(err).toLowerCase();
  return (
    code === "P1001" ||
    code === "P1002" ||
    code === "P1017" ||
    msg.includes("can't reach database") ||
    msg.includes("connection") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("database not configured")
  );
}

/** One-click portal login — session cookie + redirect on the same host. */
export async function GET(request: Request) {
  const origin = getRequestOrigin(request);
  const url = new URL(request.url);
  const portalParam = url.searchParams.get("portal");
  const portal: PortalId = isPortalId(portalParam) ? portalParam : "client";
  const account = PORTAL_ACCOUNTS[portal];
  const config = getConfigStatus();

  if (!config.authSecret) {
    console.error("Portal login: AUTH_SECRET not configured");
    return loginRedirect(origin, "config", portal);
  }

  if (!config.database) {
    console.error("Portal login: DATABASE_URL not configured");
    return loginRedirect(origin, "database", portal);
  }

  try {
    try {
      if (portal === "client") {
        await ensureDemoUser();
      } else {
        await ensurePortalUser(portal);
      }
    } catch (err) {
      console.error("Portal login ensure failed:", formatError(err));
      if (isDatabaseConnectionError(err)) {
        return loginRedirect(origin, "database", portal);
      }
      throw err;
    }

    const result = await signIn("credentials", {
      email: account.email,
      password: account.password,
      redirect: false,
    });

    if (result && typeof result === "object" && "error" in result && result.error) {
      console.error("Portal signIn error:", result.error);
      return loginRedirect(origin, "demo", portal);
    }

    return NextResponse.redirect(new URL(account.home, origin));
  } catch (err) {
    if (err instanceof AuthError) {
      console.error("Portal login AuthError:", err.type, err.message);
      const isConfig = String(err.type).toLowerCase().includes("configuration");
      return loginRedirect(origin, isConfig ? "config" : "demo", portal);
    }
    console.error("Portal login route error:", formatError(err));
    if (isDatabaseConnectionError(err)) {
      return loginRedirect(origin, "database", portal);
    }
    return loginRedirect(origin, "demo", portal);
  }
}
