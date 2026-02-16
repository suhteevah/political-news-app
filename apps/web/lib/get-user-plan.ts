import { createClient } from "@/lib/supabase/server";

export type UserPlan = "free" | "pro" | "intelligence";

export async function getUserPlan(userId?: string): Promise<UserPlan> {
  if (!userId) return "free";

  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!subscription) return "free";

  // Check if subscription is still within the billing period
  if (new Date(subscription.current_period_end) < new Date()) {
    return "free";
  }

  return subscription.plan as UserPlan;
}
