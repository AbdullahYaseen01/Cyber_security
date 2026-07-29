import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { stripe, getStripePriceId } from "@/lib/stripe";
import type { TierId } from "@/lib/tiers";
import { prisma } from "@/lib/db";

const checkoutSchema = z.object({
  tier: z.enum(["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"]),
  cycle: z.enum(["monthly", "annual"]).default("annual"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { tier, cycle } = checkoutSchema.parse(body);

    if (!stripe) {
      return NextResponse.json({
        error: "Stripe not configured",
        message: "Set STRIPE_SECRET_KEY in environment",
      }, { status: 503 });
    }

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: session.orgId } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.sub } });

    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: { orgId: org.id },
      });
      customerId = customer.id;
      await prisma.organization.update({
        where: { id: org.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const priceId = getStripePriceId(tier as TierId, cycle);
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 7 },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pricing?checkout=cancelled`,
      metadata: { orgId: org.id, tier },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
