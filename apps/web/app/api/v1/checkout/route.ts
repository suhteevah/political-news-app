import { NextRequest, NextResponse } from "next/server";
import {
  createMobileClient,
  getMobileUser,
} from "@/lib/supabase/mobile";
import { stripe, PLANS } from "@/lib/stripe";

/**
 * POST /api/v1/checkout
 *
 * Creates a Stripe Checkout session for mobile clients. Supports custom
 * success/cancel URLs so the mobile app can use deep links
 * (e.g. therightwire://checkout/success).
 *
 * Body: { plan, billingPeriod, success_url?, cancel_url? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plan, billingPeriod, success_url, cancel_url } = body as {
      plan?: string;
      billingPeriod?: string;
      success_url?: string;
      cancel_url?: string;
    };

    // Validate plan
    if (!plan || (plan !== "pro" && plan !== "intelligence")) {
      return NextResponse.json(
        { error: "plan must be 'pro' or 'intelligence'" },
        { status: 400 }
      );
    }

    // Resolve price ID server-side (never trust client-sent price IDs)
    let priceId: string;
    if (plan === "pro") {
      priceId =
        billingPeriod === "yearly"
          ? PLANS.pro.yearly_price_id
          : PLANS.pro.monthly_price_id;
    } else {
      priceId = PLANS.intelligence.monthly_price_id;
    }

    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured" },
        { status: 500 }
      );
    }

    // Look up or create Stripe customer
    const supabase = await createMobileClient();
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = existingCustomer?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    // Determine redirect URLs — use deep links if provided, otherwise fall back to web
    const { origin } = new URL(request.url);
    const successUrl = success_url || `${origin}/pricing?success=true`;
    const cancelUrl = cancel_url || `${origin}/pricing?canceled=true`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
        plan,
        source: "mobile",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Unexpected error in POST /api/v1/checkout:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
