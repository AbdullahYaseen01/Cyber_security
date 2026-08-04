import { NextResponse } from "next/server";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { ensureDemoUser, DEMO_CREDENTIALS } from "@/lib/demo-auth";
import { getConfigStatus } from "@/lib/env";
import { getRequestOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";

function loginRedirect(origin: string, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${error}`, origin));
}

/** One-click demo login — session cookie + redirect on the same host. */
export async function GET(request: Request) {
  const origin = getRequestOrigin(request);
  const config = getConfigStatus();

  if (!config.authSecret) {
    console.error("Demo login: AUTH_SECRET not configured");
    return loginRedirect(origin, "config");
  }

  if (!config.database) {
    console.error("Demo login: DATABASE_URL not configured");
    return loginRedirect(origin, "database");
  }

  try {
    await ensureDemoUser();

    const result = await signIn("credentials", {
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
      redirect: false,
    });

    if (result && typeof result === "object" && "error" in result && result.error) {
      console.error("Demo signIn error:", result.error);
      return loginRedirect(origin, "demo");
    }

    return NextResponse.redirect(new URL("/dashboard", origin));
  } catch (err) {
    if (err instanceof AuthError) {
      console.error("Demo login AuthError:", err.type, err.message);
      const isConfig = String(err.type).toLowerCase().includes("configuration");
      return loginRedirect(origin, isConfig ? "config" : "demo");
    }
    console.error("Demo login route error:", err);
    return loginRedirect(origin, "demo");
  }
}
