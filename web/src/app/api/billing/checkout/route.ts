import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { stripe, getStripePriceId } from "@/lib/stripe";
import type { TierId } from "@/lib/tiers";
import { prisma } from "@/lib/db";

const checkoutSchema = z.object({
  tier: z.enum(["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"]),
  cycle: z.enum(["monthly", "quarterly", "annual"]).default("annual"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tier, cycle } = checkoutSchema.parse(body);

    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: session.user.orgId },
      include: { subscription: true },
    });

    let customerId = org.subscription?.stripeCustomerId;
    if (!customerId || customerId.startsWith("pending_") || customerId.startsWith("demo_")) {
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/settings/billing?checkout=cancel`,
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
