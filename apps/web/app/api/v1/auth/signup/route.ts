import { NextRequest, NextResponse } from "next/server";
import { createMobileClient as createClient } from "@/lib/supabase/mobile";
import { getAdminClient } from "@/lib/supabase/mobile";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, referral_code } = body as {
      email?: string;
      password?: string;
      referral_code?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 422 }
      );
    }

    const { user, session } = data;

    if (!user) {
      return NextResponse.json(
        { error: "Signup failed." },
        { status: 422 }
      );
    }

    // Process referral code if provided (mobile equivalent of cookie-based web flow)
    if (referral_code && typeof referral_code === "string") {
      try {
        const admin = getAdminClient();

        // Find the referrer by referral code
        const { data: referrer } = await admin
          .from("profiles")
          .select("id")
          .eq("referral_code", referral_code.trim())
          .single();

        if (referrer && referrer.id !== user.id) {
          // Create referral record
          await admin.from("referrals").insert({
            referrer_id: referrer.id,
            referred_id: user.id,
            status: "completed",
          });

          // Grant 7 days of Pro to both referrer and referred user
          const sevenDays = 7 * 24 * 60 * 60 * 1000;

          // Grant to referred user (new user)
          const referredProUntil = new Date(Date.now() + sevenDays).toISOString();
          await admin
            .from("profiles")
            .update({ referral_pro_until: referredProUntil })
            .eq("id", user.id);

          // Grant to referrer (stack on existing time if any)
          const { data: referrerProfile } = await admin
            .from("profiles")
            .select("referral_pro_until")
            .eq("id", referrer.id)
            .single();

          const existingExpiry = referrerProfile?.referral_pro_until
            ? new Date(referrerProfile.referral_pro_until)
            : null;
          const baseTime =
            existingExpiry && existingExpiry > new Date()
              ? existingExpiry.getTime()
              : Date.now();
          const referrerProUntil = new Date(baseTime + sevenDays).toISOString();

          await admin
            .from("profiles")
            .update({ referral_pro_until: referrerProUntil })
            .eq("id", referrer.id);

          // Update referral status to rewarded
          await admin
            .from("referrals")
            .update({ status: "rewarded" })
            .eq("referrer_id", referrer.id)
            .eq("referred_id", user.id);

          // Track analytics event
          await admin.from("analytics_events").insert({
            event_type: "referral_completed",
            user_id: user.id,
            metadata: {
              referrer_id: referrer.id,
              referral_code: referral_code.trim(),
              source: "mobile",
            },
          });
        }
      } catch (refErr) {
        // Don't fail signup if referral processing fails
        console.error("Referral processing error:", refErr);
      }
    }

    // If email confirmation is required, session may be null.
    // Return what we have and let the client handle the confirmation flow.
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      session: session
        ? {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
          }
        : null,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
