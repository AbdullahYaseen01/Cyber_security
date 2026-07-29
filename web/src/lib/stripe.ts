import Stripe from "stripe";
import { TIERS, type TierId } from "./tiers";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const STRIPE_PRICE_IDS: Record<TierId, { monthly: string; annual: string }> = {
  STARTER: {
    monthly: process.env.STRIPE_STARTER_MONTHLY ?? "price_starter_monthly",
    annual: process.env.STRIPE_STARTER_ANNUAL ?? "price_starter_annual",
  },
  PROFESSIONAL: {
    monthly: process.env.STRIPE_PRO_MONTHLY ?? "price_pro_monthly",
    annual: process.env.STRIPE_PRO_ANNUAL ?? "price_pro_annual",
  },
  BUSINESS: {
    monthly: process.env.STRIPE_BUSINESS_MONTHLY ?? "price_business_monthly",
    annual: process.env.STRIPE_BUSINESS_ANNUAL ?? "price_business_annual",
  },
  ENTERPRISE: {
    monthly: process.env.STRIPE_ENTERPRISE_MONTHLY ?? "price_enterprise_monthly",
    annual: process.env.STRIPE_ENTERPRISE_ANNUAL ?? "price_enterprise_annual",
  },
};

export function getStripePriceId(tier: TierId, cycle: "monthly" | "annual"): string {
  return STRIPE_PRICE_IDS[tier][cycle];
}

export function tierFromStripePrice(priceId: string): TierId | null {
  for (const [tier, prices] of Object.entries(STRIPE_PRICE_IDS)) {
    if (prices.monthly === priceId || prices.annual === priceId) {
      return tier as TierId;
    }
  }
  return null;
}

export function formatPrice(tier: TierId, annual: boolean): string {
  const config = TIERS[tier];
  const price = annual ? config.annualPrice / 12 : config.monthlyPrice;
  return price % 1 === 0 ? `$${price}` : `$${price.toFixed(2)}`;
}
