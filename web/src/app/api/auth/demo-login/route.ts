import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { ensureDemoUser, DEMO_CREDENTIALS } from "@/lib/demo-auth";

export const runtime = "nodejs";

/** One-click demo login — session cookie + redirect on the same host. */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  try {
    await ensureDemoUser();

    const result = await signIn("credentials", {
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
      redirect: false,
    });

    if (result && typeof result === "object" && "error" in result && result.error) {
      console.error("Demo signIn error:", result.error);
      return NextResponse.redirect(new URL("/login?error=demo", origin));
    }

    return NextResponse.redirect(new URL("/dashboard", origin));
  } catch (err) {
    console.error("Demo login route error:", err);
    return NextResponse.redirect(new URL("/login?error=demo", origin));
  }
}
