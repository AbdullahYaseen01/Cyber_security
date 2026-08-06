import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/admin",
    "/admin/:path*",
    "/tester",
    "/tester/:path*",
    "/onboarding/:path*",
    "/login",
    "/signup",
  ],
};
