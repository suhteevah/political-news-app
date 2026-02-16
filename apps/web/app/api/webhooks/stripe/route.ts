import { stripe } from "@/lib/stripe";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Use service role key for webhook handler — bypasses RLS
function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription && session.metadata?.user_id) {
          const subscription: any = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          const plan = session.metadata.plan || "pro";

          // Get period end from the first subscription item
          const periodEnd = subscription.items?.data?.[0]?.current_period_end
            || Math.floor(Date.now() / 1000) + 30 * 86400; // fallback: 30 days

          // Upsert customer record
          await supabase.from("customers").upsert({
            user_id: session.metadata.user_id,
            stripe_customer_id: session.customer as string,
          }, { onConflict: "user_id" });

          // Upsert subscription record
          await supabase.from("subscriptions").upsert({
            user_id: session.metadata.user_id,
            stripe_subscription_id: subscription.id,
            plan,
            status: subscription.status,
            current_period_end: new Date(periodEnd * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          }, { onConflict: "stripe_subscription_id" });

          // Track event
          await supabase.from("analytics_events").insert({
            event_type: "subscription_created",
            user_id: session.metadata.user_id,
            metadata: { plan, subscription_id: subscription.id },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription: any = event.data.object;
        const { data: customer } = await supabase
          .from("customers")
          .select("user_id")
          .eq("stripe_customer_id", subscription.customer as string)
          .single();

        if (customer) {
          const priceId = subscription.items?.data?.[0]?.price?.id;
          const periodEnd = subscription.items?.data?.[0]?.current_period_end
            || Math.floor(Date.now() / 1000) + 30 * 86400;

          let plan = "pro";
          if (priceId === process.env.STRIPE_INTELLIGENCE_MONTHLY_PRICE_ID) {
            plan = "intelligence";
          }

          await supabase.from("subscriptions").upsert({
            user_id: customer.user_id,
            stripe_subscription_id: subscription.id,
            plan,
            status: subscription.status,
            current_period_end: new Date(periodEnd * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          }, { onConflict: "stripe_subscription_id" });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription: any = event.data.object;
        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice: any = event.data.object;
        if (invoice.subscription) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription as string);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
