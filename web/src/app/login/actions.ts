"use server";

import { signIn } from "@/lib/auth";
import { ensureDemoUser, DEMO_CREDENTIALS } from "@/lib/demo-auth";

/** Server-side demo login — sets session cookie and redirects to dashboard. */
export async function loginWithDemo() {
  await ensureDemoUser();
  await signIn("credentials", {
    email: DEMO_CREDENTIALS.email,
    password: DEMO_CREDENTIALS.password,
    redirectTo: "/dashboard",
  });
}
