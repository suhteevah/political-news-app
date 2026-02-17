import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Fetch current user's email preferences
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: prefs } = await supabase
    .from("email_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Return defaults if no preferences row exists
  return NextResponse.json({
    preferences: prefs || {
      breaking_alerts: true,
      daily_digest: true,
      weekly_newsletter: true,
      alert_categories: [
        "Breaking",
        "Politics",
        "Economy",
        "Culture",
        "Media",
        "World",
        "Opinion",
      ],
    },
  });
}

// PUT: Update current user's email preferences
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (typeof body.breaking_alerts === "boolean") {
    updates.breaking_alerts = body.breaking_alerts;
  }
  if (typeof body.daily_digest === "boolean") {
    updates.daily_digest = body.daily_digest;
  }
  if (typeof body.weekly_newsletter === "boolean") {
    updates.weekly_newsletter = body.weekly_newsletter;
  }
  if (Array.isArray(body.alert_categories)) {
    updates.alert_categories = body.alert_categories;
  }

  // Upsert: create if not exists, update if exists
  const { error } = await supabase.from("email_preferences").upsert(
    {
      user_id: user.id,
      ...updates,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Email preferences update error:", error.message);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ updated: true });
}
