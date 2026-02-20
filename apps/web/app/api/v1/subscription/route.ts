import { NextResponse } from "next/server";
import { createMobileClient as createClient } from "@/lib/supabase/mobile";
import { getUserPlan } from "@/lib/get-user-plan";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get plan via existing helper
    const plan = await getUserPlan(user.id, supabase);

    // Fetch the raw subscription row (most recent active/trialing)
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select(
        "id, user_id, stripe_subscription_id, plan, status, current_period_end, cancel_at_period_end, created_at"
      )
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Fetch referral_pro_until from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_pro_until")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      plan,
      subscription: subscription ?? null,
      referral_pro_until: profile?.referral_pro_until ?? null,
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/subscription:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
