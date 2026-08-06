import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config — used by middleware only.
 * Do not import prisma, bcrypt, or other Node-only modules here.
 */

const PUBLIC_PREFIXES = ["/pricing", "/api/webhooks", "/api/auth"];
const LOGIN_PATHS = ["/login", "/signup", "/admin/login", "/tester/login"];

function homeFor(role: string | undefined): string {
  if (role === "ADMIN") return "/admin";
  if (role === "TESTER") return "/tester";
  return "/dashboard";
}

export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/onboarding/organization",
  },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.sub as string;
        const u = session.user as SessionUser;
        u.orgId = (token.orgId as string) ?? null;
        u.role = (token.role as string) ?? "VIEWER";
        u.platformRole = (token.platformRole as string) ?? "CLIENT";
        u.tier = (token.tier as string) ?? "STARTER";
        u.subscriptionStatus = (token.subscriptionStatus as string) ?? "INCOMPLETE";
        u.isDemo = Boolean(token.isDemo);
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const platformRole = (auth?.user as SessionUser | undefined)?.platformRole ?? "CLIENT";

      if (LOGIN_PATHS.includes(pathname)) {
        if (isLoggedIn) {
          return Response.redirect(new URL(homeFor(platformRole), request.nextUrl));
        }
        return true;
      }

      if (pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
        return true;
      }

      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return Response.redirect(new URL("/admin/login", request.nextUrl));
        if (platformRole !== "ADMIN") {
          return Response.redirect(new URL(homeFor(platformRole), request.nextUrl));
        }
        return true;
      }

      if (pathname.startsWith("/tester")) {
        if (!isLoggedIn) return Response.redirect(new URL("/tester/login", request.nextUrl));
        if (platformRole !== "TESTER" && platformRole !== "ADMIN") {
          return Response.redirect(new URL(homeFor(platformRole), request.nextUrl));
        }
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
  platformRole: string;
  tier: string;
  subscriptionStatus: string;
  isDemo?: boolean;
}
