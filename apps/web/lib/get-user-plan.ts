import { createClient } from "@/lib/supabase/server";

export type UserPlan = "free" | "pro" | "intelligence";

export async function getUserPlan(userId?: string): Promise<UserPlan> {
  if (!userId) return "free";

  const supabase = await createClient();

  // Check for paid Stripe subscription first
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (subscription && new Date(subscription.current_period_end) > new Date()) {
    return subscription.plan as UserPlan;
  }

  // Check for referral-earned Pro time (no card needed, stackable)
  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_pro_until")
    .eq("id", userId)
    .single();

  if (profile?.referral_pro_until && new Date(profile.referral_pro_until) > new Date()) {
    return "pro";
  }

  return "free";
}

// Helper to get referral Pro expiry for display purposes
export async function getReferralProExpiry(userId: string): Promise<Date | null> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_pro_until")
    .eq("id", userId)
    .single();

  if (profile?.referral_pro_until) {
    const expiry = new Date(profile.referral_pro_until);
    if (expiry > new Date()) return expiry;
  }

  return null;
}
