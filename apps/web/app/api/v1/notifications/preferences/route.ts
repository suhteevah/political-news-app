import { NextRequest, NextResponse } from "next/server";
import { createMobileClient, getMobileUser } from "@/lib/supabase/mobile";

const DEFAULT_PREFERENCES = {
  breaking_alerts: true,
  wire_posts: true,
  comment_replies: true,
  new_followers: true,
  daily_digest: false,
};

export async function GET() {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createMobileClient();

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching notification preferences:", error);
      return NextResponse.json(
        { error: "Failed to fetch notification preferences" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({
        user_id: user.id,
        ...DEFAULT_PREFERENCES,
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Notification preferences GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createMobileClient();

    const body = await request.json();
    const {
      breaking_alerts,
      wire_posts,
      comment_replies,
      new_followers,
      daily_digest,
    } = body;

    const updates: Record<string, unknown> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (typeof breaking_alerts === "boolean")
      updates.breaking_alerts = breaking_alerts;
    if (typeof wire_posts === "boolean") updates.wire_posts = wire_posts;
    if (typeof comment_replies === "boolean")
      updates.comment_replies = comment_replies;
    if (typeof new_followers === "boolean")
      updates.new_followers = new_followers;
    if (typeof daily_digest === "boolean") updates.daily_digest = daily_digest;

    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(updates, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("Error updating notification preferences:", error);
      return NextResponse.json(
        { error: "Failed to update notification preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Notification preferences PUT error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
