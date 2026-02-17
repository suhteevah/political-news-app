import { NextResponse, type NextRequest } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const admin = getAdminClient();

  // Check if logged in — if so, update their email_preferences
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    await admin.from("email_preferences").upsert(
      {
        user_id: user.id,
        weekly_newsletter: true,
      },
      { onConflict: "user_id" }
    );
  }

  // Also add to newsletter_subscribers for email marketing
  const { error } = await admin.from("newsletter_subscribers").upsert(
    {
      email: email.toLowerCase().trim(),
      is_active: true,
      source: user ? "website-authenticated" : "website-anonymous",
    },
    { onConflict: "email" }
  );

  if (error) {
    console.error("Newsletter signup error:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  // Track analytics
  await admin.from("analytics_events").insert({
    event_type: "newsletter_signup",
    user_id: user?.id || null,
    metadata: { source: user ? "authenticated" : "anonymous" },
  });

  return NextResponse.json({ success: true });
}

// Unsubscribe endpoint
export async function DELETE(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const admin = getAdminClient();

  await admin
    .from("newsletter_subscribers")
    .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
    .eq("email", email.toLowerCase().trim());

  return NextResponse.json({ success: true });
}
