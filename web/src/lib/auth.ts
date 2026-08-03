import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthSecret, isDatabaseConfigured } from "@/lib/env";
import { authConfig, type SessionUser } from "./auth.config";
import { ensureDemoUser, isDemoLogin } from "@/lib/demo-auth";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const oauthProviders = [
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : []),
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? [
        GitHub({
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : []),
];

const authSecret = getAuthSecret();
const useAdapter = isDatabaseConfigured() && oauthProviders.length > 0;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  ...(useAdapter ? { adapter: PrismaAdapter(prisma) } : {}),
  secret: authSecret || undefined,
  providers: [
    ...oauthProviders,
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        if (isDemoLogin(parsed.data.email, parsed.data.password)) {
          if (!isDatabaseConfigured()) {
            throw new Error("Database not configured. Set DATABASE_URL in Vercel.");
          }
          const { user, membership } = await ensureDemoUser();
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            orgId: membership.orgId,
            role: membership.role,
            tier: "ENTERPRISE",
            subscriptionStatus: "ACTIVE",
            isDemo: true,
          };
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: {
            orgs: { include: { org: { include: { subscription: true } } } },
          },
        });

        if (!user?.password) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        const membership = user.orgs[0];
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          orgId: membership?.orgId ?? null,
          role: membership?.role ?? "VIEWER",
          tier: membership?.org.subscription?.tier ?? "STARTER",
          subscriptionStatus: membership?.org.subscription?.status ?? "INCOMPLETE",
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.orgId = (user as { orgId?: string }).orgId ?? null;
        token.role = (user as { role?: string }).role ?? "VIEWER";
        token.tier = (user as { tier?: string }).tier ?? "STARTER";
        token.subscriptionStatus =
          (user as { subscriptionStatus?: string }).subscriptionStatus ?? "INCOMPLETE";
        token.isDemo = Boolean((user as { isDemo?: boolean }).isDemo);
      }

      if (trigger === "update" && session) {
        token.orgId = session.orgId ?? token.orgId;
        token.role = session.role ?? token.role;
        token.tier = session.tier ?? token.tier;
        token.subscriptionStatus = session.subscriptionStatus ?? token.subscriptionStatus;
      }

      if (token.sub && (!token.orgId || trigger === "update")) {
        try {
          const membership = await prisma.orgMember.findFirst({
            where: { userId: token.sub as string },
            include: { org: { include: { subscription: true } } },
            orderBy: { joinedAt: "asc" },
          });
          if (membership) {
            token.orgId = membership.orgId;
            token.role = membership.role;
            token.tier = membership.org.subscription?.tier ?? "STARTER";
            token.subscriptionStatus = membership.org.subscription?.status ?? "INCOMPLETE";
          }
        } catch {
          // Database unavailable — keep existing token claims
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        (session.user as SessionUser).orgId = (token.orgId as string) ?? null;
        (session.user as SessionUser).role = (token.role as string) ?? "VIEWER";
        (session.user as SessionUser).tier = (token.tier as string) ?? "STARTER";
        (session.user as SessionUser).subscriptionStatus =
          (token.subscriptionStatus as string) ?? "INCOMPLETE";
        (session.user as SessionUser).isDemo = Boolean(token.isDemo);
      }
      return session;
    },
  },
});

export async function getServerSession() {
  return auth();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

export type { SessionUser };
