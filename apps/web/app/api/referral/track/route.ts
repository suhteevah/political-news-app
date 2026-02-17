import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const REFERRAL_REWARD_DAYS = 7;

// Called after signup to track referrals
export async function POST(request: NextRequest) {
  const referralCode = request.cookies.get("referral_code")?.value;

  if (!referralCode) {
    return NextResponse.json({ tracked: false, reason: "no_referral_code" });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ tracked: false, reason: "not_authenticated" });
  }

  const admin = getAdminClient();

  // Find the referrer by code
  const { data: referrer } = await admin
    .from("profiles")
    .select("id, referral_pro_until")
    .eq("referral_code", referralCode)
    .single();

  if (!referrer || referrer.id === user.id) {
    return NextResponse.json({ tracked: false, reason: "invalid_referrer" });
  }

  // Check if this user was already referred
  const { data: existing } = await admin
    .from("referrals")
    .select("id")
    .eq("referred_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ tracked: false, reason: "already_referred" });
  }

  // Create the referral record
  const { error } = await admin.from("referrals").insert({
    referrer_id: referrer.id,
    referred_id: user.id,
    status: "completed",
  });

  if (error) {
    console.error("Referral tracking error:", error.message);
    return NextResponse.json({ tracked: false, reason: "db_error" });
  }

  // === REWARD: Grant 7 days of Wire Pro to the REFERRER ===
  // Stack on top of existing referral Pro time
  const now = new Date();
  const currentProUntil = referrer.referral_pro_until
    ? new Date(referrer.referral_pro_until)
    : null;

  // If they already have referral Pro time that hasn't expired, add 7 days to that
  // If expired or never had it, start from now + 7 days
  const baseDate = currentProUntil && currentProUntil > now
    ? currentProUntil
    : now;

  const newProUntil = new Date(baseDate.getTime() + REFERRAL_REWARD_DAYS * 24 * 60 * 60 * 1000);

  await admin
    .from("profiles")
    .update({ referral_pro_until: newProUntil.toISOString() })
    .eq("id", referrer.id);

  // === REWARD: Also give the NEW USER 7 days of Wire Pro ===
  await admin
    .from("profiles")
    .update({ referral_pro_until: new Date(now.getTime() + REFERRAL_REWARD_DAYS * 24 * 60 * 60 * 1000).toISOString() })
    .eq("id", user.id);

  // Track analytics
  await admin.from("analytics_events").insert({
    event_type: "referral_completed",
    user_id: user.id,
    metadata: {
      referrer_id: referrer.id,
      referral_code: referralCode,
      referrer_pro_until: newProUntil.toISOString(),
      reward_days: REFERRAL_REWARD_DAYS,
    },
  });

  // Clear the cookie
  const response = NextResponse.json({ tracked: true, reward_days: REFERRAL_REWARD_DAYS });
  response.cookies.set("referral_code", "", { maxAge: 0, path: "/" });

  return response;
}
