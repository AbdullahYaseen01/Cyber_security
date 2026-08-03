import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config — used by middleware only.
 * Do not import prisma, bcrypt, or other Node-only modules here.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/onboarding/organization",
  },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
      const isPublic =
        pathname === "/" ||
        pathname.startsWith("/pricing") ||
        pathname.startsWith("/api/webhooks");

      if (isPublic) return true;
      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", request.nextUrl));
        return true;
      }
      if (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) {
        return isLoggedIn;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  orgId: string | null;
  role: string;
  tier: string;
  subscriptionStatus: string;
  isDemo?: boolean;
}
