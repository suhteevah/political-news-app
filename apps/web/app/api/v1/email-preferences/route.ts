import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULTS = {
  daily_digest: true,
  weekly_newsletter: true,
  breaking_alerts: true,
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: prefs, error } = await supabase
      .from("email_preferences")
      .select("daily_digest, weekly_newsletter, breaking_alerts")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned — that's fine, we use defaults
      console.error("Error fetching email preferences:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch email preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preferences: prefs
        ? {
            daily_digest: prefs.daily_digest,
            weekly_newsletter: prefs.weekly_newsletter,
            breaking_alerts: prefs.breaking_alerts,
          }
        : DEFAULTS,
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/email-preferences:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate: only allow known boolean fields
    const allowedFields = [
      "daily_digest",
      "weekly_newsletter",
      "breaking_alerts",
    ] as const;

    const updatePayload: Record<string, boolean> = {};
    for (const field of allowedFields) {
      if (field in body) {
        if (typeof body[field] !== "boolean") {
          return NextResponse.json(
            { error: `Field "${field}" must be a boolean` },
            { status: 400 }
          );
        }
        updatePayload[field] = body[field];
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided" },
        { status: 400 }
      );
    }

    const { data: upserted, error } = await supabase
      .from("email_preferences")
      .upsert(
        { user_id: user.id, ...updatePayload },
        { onConflict: "user_id" }
      )
      .select("daily_digest, weekly_newsletter, breaking_alerts")
      .single();

    if (error) {
      console.error("Error upserting email preferences:", error.message);
      return NextResponse.json(
        { error: "Failed to update email preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preferences: {
        daily_digest: upserted.daily_digest,
        weekly_newsletter: upserted.weekly_newsletter,
        breaking_alerts: upserted.breaking_alerts,
      },
    });
  } catch (err) {
    console.error("Unexpected error in PUT /api/v1/email-preferences:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
