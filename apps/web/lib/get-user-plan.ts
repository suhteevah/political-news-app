import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type UserPlan = "free" | "pro" | "intelligence";

/**
 * Resolves the user's current plan. Priority order:
 * 1. Active Stripe subscription (highest)
 * 2. Referral-earned Pro time (fallback)
 * 3. Free (default)
 *
 * @param userId - The user's UUID
 * @param supabaseClient - Optional Supabase client to use. If not provided,
 *   creates a cookie-based server client (for web routes). For mobile/v1 routes,
 *   pass an admin client or mobile client to avoid cookie dependency.
 */
export async function getUserPlan(
  userId?: string,
  supabaseClient?: SupabaseClient
): Promise<UserPlan> {
  if (!userId) return "free";

  const supabase = supabaseClient || (await createClient());

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
export async function getReferralProExpiry(
  userId: string,
  supabaseClient?: SupabaseClient
): Promise<Date | null> {
  const supabase = supabaseClient || (await createClient());
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
