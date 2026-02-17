import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
    .select("id")
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

  // Track analytics
  await admin.from("analytics_events").insert({
    event_type: "referral_completed",
    user_id: user.id,
    metadata: { referrer_id: referrer.id, referral_code: referralCode },
  });

  // Clear the cookie
  const response = NextResponse.json({ tracked: true });
  response.cookies.set("referral_code", "", { maxAge: 0, path: "/" });

  return response;
}
