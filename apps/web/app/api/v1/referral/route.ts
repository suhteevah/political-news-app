import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get referral code and Pro expiry from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("referral_code, referral_pro_until")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError.message);
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 }
      );
    }

    // Count total referrals
    const { count: totalReferrals, error: totalError } = await supabase
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", user.id);

    if (totalError) {
      console.error("Error counting total referrals:", totalError.message);
    }

    // Count completed referrals (status = 'completed' or 'rewarded')
    const { count: completedReferrals, error: completedError } = await supabase
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", user.id)
      .in("status", ["completed", "rewarded"]);

    if (completedError) {
      console.error(
        "Error counting completed referrals:",
        completedError.message
      );
    }

    return NextResponse.json({
      referral_code: profile?.referral_code ?? null,
      total_referrals: totalReferrals ?? 0,
      completed_referrals: completedReferrals ?? 0,
      referral_pro_until: profile?.referral_pro_until ?? null,
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/referral:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
