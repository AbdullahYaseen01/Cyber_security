import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildTokenForUser, setAuthCookies, logAudit } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { memberships: { include: { org: true } } },
    });

    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const membership = user.memberships[0];
    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    const org = membership.org;
    const tokens = await buildTokenForUser(user.id, org.id);
    await setAuthCookies(tokens.access, tokens.refresh);
    await logAudit("auth.login", {
      userId: user.id,
      orgId: org.id,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        orgId: org.id,
        orgName: org.name,
        role: membership.role,
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
    console.error("Login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
