import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripePriceId } from "@/lib/stripe";
import type { TierId } from "@/lib/tiers";
import { z } from "zod";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const checkoutSchema = z.object({
  tier: z.enum(["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"]),
  cycle: z.enum(["monthly", "annual"]).default("monthly"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const body = await req.json();
    const { tier, cycle } = checkoutSchema.parse(body);

    const org = await prisma.organization.findUnique({
      where: { id: session.user.orgId },
      include: { subscription: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    let customerId = org.subscription?.stripeCustomerId;
    if (!customerId || customerId.startsWith("pending_")) {
      const customer = await stripe.customers.create({
        email: session.user.email ?? undefined,
        name: org.name,
        metadata: { orgId: org.id },
      });
      customerId = customer.id;
      await prisma.subscription.update({
        where: { orgId: org.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const priceId = getStripePriceId(tier as TierId, cycle);
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL ?? "http://localhost:3000"}/dashboard?checkout=success`,
      cancel_url: `${process.env.APP_URL ?? "http://localhost:3000"}/onboarding/subscription?checkout=cancel`,
      metadata: { orgId: org.id, tier },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { orgId: session.user.orgId },
  });

  return NextResponse.json({ subscription });
}
