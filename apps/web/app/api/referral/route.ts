import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Get current user's referral info
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get referral code
  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", user.id)
    .single();

  // Get referral stats
  const { count: totalReferrals } = await supabase
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", user.id);

  const { count: completedReferrals } = await supabase
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", user.id)
    .eq("status", "completed");

  return NextResponse.json({
    referralCode: profile?.referral_code,
    referralLink: `https://the-right-wire.com/?ref=${profile?.referral_code}`,
    totalReferrals: totalReferrals || 0,
    completedReferrals: completedReferrals || 0,
  });
}
