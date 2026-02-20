import { NextRequest, NextResponse } from "next/server";
import {
  createMobileClient,
  getMobileUser,
} from "@/lib/supabase/mobile";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/v1/donate
 *
 * Creates a one-time Stripe Checkout session in payment mode for donations/tips.
 * Supports custom success/cancel URLs for mobile deep linking.
 *
 * Body: { amount, success_url?, cancel_url? }
 *   - amount: integer in cents ($1 = 100, $500 = 50000)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, success_url, cancel_url } = body as {
      amount?: number;
      success_url?: string;
      cancel_url?: string;
    };

    // Validate amount in cents — min $1 (100), max $500 (50000)
    const cents = Math.round(Number(amount));
    if (!cents || isNaN(cents) || cents < 100 || cents > 50000) {
      return NextResponse.json(
        { error: "amount must be between 100 ($1) and 50000 ($500) cents" },
        { status: 400 }
      );
    }

    // Determine redirect URLs
    const { origin } = new URL(request.url);
    const successUrl = success_url || `${origin}/pricing?donated=true`;
    const cancelUrl = cancel_url || `${origin}/pricing?canceled=true`;

    // Build checkout session params
    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Support The Right Wire",
              description: `One-time tip of $${(cents / 100).toFixed(2)}`,
            },
            unit_amount: cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
        type: "donation",
        source: "mobile",
      },
    };

    // Attach existing Stripe customer if the user has one
    const supabase = await createMobileClient();
    const { data: customer } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (customer?.stripe_customer_id) {
      sessionParams.customer = customer.stripe_customer_id;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Unexpected error in POST /api/v1/donate:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
