import Stripe from "stripe";

// Lazy initialization — avoids build-time error when STRIPE_SECRET_KEY is not yet set
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// For backwards compat — getter that lazily initializes
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});

export const PLANS = {
  pro: {
    name: "Wire Pro",
    price_monthly: "$6.99",
    price_yearly: "$59.99",
    monthly_price_id: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || "",
    yearly_price_id: process.env.STRIPE_PRO_YEARLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || "",
  },
  intelligence: {
    name: "Wire Intelligence",
    price_monthly: "$19.99",
    monthly_price_id: process.env.STRIPE_INTELLIGENCE_MONTHLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_INTELLIGENCE_MONTHLY_PRICE_ID || "",
  },
} as const;
