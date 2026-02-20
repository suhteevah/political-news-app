import { NextRequest, NextResponse } from "next/server";
import {
  createMobileClient,
  getMobileUser,
} from "@/lib/supabase/mobile";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/v1/portal
 *
 * Creates a Stripe Customer Portal session for mobile clients. The portal
 * lets users manage their subscription (cancel, update payment method, etc.).
 * Supports a custom return_url for deep linking back into the mobile app.
 *
 * Body: { return_url? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse body — return_url is optional
    let return_url: string | undefined;
    try {
      const body = await request.json();
      return_url = body.return_url;
    } catch {
      // Empty body is fine — return_url will default
    }

    // Look up the user's Stripe customer ID
    const supabase = await createMobileClient();
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (customerError || !customer?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    // Determine return URL — use deep link if provided, otherwise fall back to web
    const { origin } = new URL(request.url);
    const returnUrl = return_url || `${origin}/profile`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("Unexpected error in POST /api/v1/portal:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
