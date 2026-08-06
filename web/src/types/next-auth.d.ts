import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      orgId: string | null;
      role: string;
      platformRole: string;
      tier: string;
      subscriptionStatus: string;
      isDemo?: boolean;
    };
  }

  interface User {
    orgId?: string | null;
    role?: string;
    platformRole?: string;
    tier?: string;
    subscriptionStatus?: string;
    isDemo?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    orgId?: string | null;
    role?: string;
    platformRole?: string;
    tier?: string;
    subscriptionStatus?: string;
    isDemo?: boolean;
  }
}

export {};
