import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { tierFromStripePrice } from "@/lib/stripe";
import type { SubscriptionStatus, SubscriptionTier } from "@prisma/client";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? ""
    );
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.orgId;
        const tier = (session.metadata?.tier ?? "STARTER") as SubscriptionTier;
        if (orgId && session.subscription) {
          await prisma.subscription.update({
            where: { orgId },
            data: {
              status: "ACTIVE",
              tier,
              stripeSubscriptionId: session.subscription as string,
              stripePriceId: session.line_items?.data[0]?.price?.id,
            },
          });
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (subId) {
          const sub = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: subId },
          });
          if (sub) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: {
                status: "ACTIVE",
                currentPeriodStart: invoice.period_start
                  ? new Date(invoice.period_start * 1000)
                  : undefined,
                currentPeriodEnd: invoice.period_end
                  ? new Date(invoice.period_end * 1000)
                  : undefined,
              },
            });
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (subId) {
          const sub = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: subId },
            include: { org: { include: { owner: true } } },
          });
          if (sub) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: { status: "PAST_DUE" },
            });
            await prisma.notification.create({
              data: {
                userId: sub.org.ownerId,
                title: "Payment Failed",
                message: "Your subscription payment failed. Please update your payment method.",
                type: "payment_failed",
                link: "/dashboard/settings/billing",
              },
            });
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "CANCELED", cancelAtPeriodEnd: false },
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (sub) {
          const priceId = subscription.items.data[0]?.price.id;
          const tier = priceId ? tierFromStripePrice(priceId) : null;
          const statusMap: Record<string, SubscriptionStatus> = {
            active: "ACTIVE",
            past_due: "PAST_DUE",
            canceled: "CANCELED",
            unpaid: "UNPAID",
            incomplete: "INCOMPLETE",
          };
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: statusMap[subscription.status] ?? "INCOMPLETE",
              tier: tier ?? sub.tier,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
