import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { ensureDemoUser, DEMO_CREDENTIALS } from "@/lib/demo-auth";
import { getAppUrl } from "@/lib/env";

export const runtime = "nodejs";

/** One-click demo login via direct navigation (no client JS required). */
export async function GET() {
  try {
    await ensureDemoUser();
    return signIn("credentials", {
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
      redirectTo: "/dashboard",
    });
  } catch (err) {
    console.error("Demo login route error:", err);
    return NextResponse.redirect(new URL("/login?error=demo", getAppUrl()));
  }
}
