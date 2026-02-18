import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { amount } = await request.json();

  // Validate amount (in dollars) — min $1, max $500
  const cents = Math.round(Number(amount) * 100);
  if (!cents || cents < 100 || cents > 50000) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const { origin } = new URL(request.url);

  // Create a one-time Stripe Checkout session
  const sessionParams: any = {
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: "Support The Right Wire",
          description: `One-time tip of $${(cents / 100).toFixed(2)}`,
        },
        unit_amount: cents,
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${origin}/pricing?donated=true`,
    cancel_url: `${origin}/pricing?canceled=true`,
  };

  // If user is logged in, attach their customer ID
  if (user) {
    const { data: customer } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (customer?.stripe_customer_id) {
      sessionParams.customer = customer.stripe_customer_id;
    }

    sessionParams.metadata = { user_id: user.id, type: "donation" };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return NextResponse.json({ url: session.url });
}
