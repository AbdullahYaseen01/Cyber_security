import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildTokenForUser, setAuthCookies, logAudit } from "@/lib/auth";
import { getTierLimits } from "@/lib/tiers";
import type { TierId } from "@/lib/tiers";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  orgName: z.string().min(1),
  tier: z.enum(["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"]).default("STARTER"),
  billingCycle: z.enum(["monthly", "annual"]).default("annual"),
});

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = signupSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const tier = data.tier as TierId;
    const limits = getTierLimits(tier);
    const trialEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        memberships: {
          create: {
            role: "OWNER",
            org: {
              create: {
                name: data.orgName,
                slug: slugify(data.orgName),
                subscriptionTier: tier,
                subscriptionStatus: "TRIALING",
                trialEndsAt: trialEnds,
                scansLimit: limits.scansPerMonth,
                domainLimit: limits.domains,
                billingCycle: data.billingCycle,
              },
            },
          },
        },
      },
      include: { memberships: { include: { org: true } } },
    });

    const org = user.memberships[0].org;
    const tokens = await buildTokenForUser(user.id, org.id);
    await setAuthCookies(tokens.access, tokens.refresh);
    await logAudit("auth.signup", { userId: user.id, orgId: org.id, details: { tier } });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        orgId: org.id,
        orgName: org.name,
        role: "OWNER",
        tier: org.subscriptionTier,
        subscriptionStatus: org.subscriptionStatus,
        scansUsed: org.scansUsedThisMonth,
        scansLimit: org.scansLimit,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Signup failed. Is the database running?" }, { status: 500 });
  }
}
