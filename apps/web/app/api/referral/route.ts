import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Get current user's referral info
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get referral code and Pro expiry
  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code, referral_pro_until")
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

  // Calculate days of Pro remaining from referrals
  let referralProDaysLeft = 0;
  if (profile?.referral_pro_until) {
    const expiry = new Date(profile.referral_pro_until);
    const now = new Date();
    if (expiry > now) {
      referralProDaysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  return NextResponse.json({
    referralCode: profile?.referral_code,
    referralLink: `https://the-right-wire.com/?ref=${profile?.referral_code}`,
    totalReferrals: totalReferrals || 0,
    completedReferrals: completedReferrals || 0,
    referralProDaysLeft,
  });
}
