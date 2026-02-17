import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Fetch user's source preferences + all available sources
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get all active curated sources
  const { data: sources } = await supabase
    .from("curated_sources")
    .select("x_handle, display_name, category, is_active")
    .eq("is_active", true)
    .order("category", { ascending: true });

  // Get user's preferences
  const { data: preferences } = await supabase
    .from("user_source_preferences")
    .select("source_handle, preference")
    .eq("user_id", user.id);

  // Build a map of preferences
  const prefMap: Record<string, string> = {};
  preferences?.forEach((p) => {
    prefMap[p.source_handle] = p.preference;
  });

  return NextResponse.json({
    sources: sources || [],
    preferences: prefMap,
  });
}

// PUT: Update a single source preference
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { sourceHandle, preference } = await request.json();

  if (!sourceHandle || !["pinned", "muted", "default"].includes(preference)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (preference === "default") {
    // Remove the preference row (means: show normally)
    await supabase
      .from("user_source_preferences")
      .delete()
      .eq("user_id", user.id)
      .eq("source_handle", sourceHandle);
  } else {
    // Upsert the preference
    await supabase.from("user_source_preferences").upsert(
      {
        user_id: user.id,
        source_handle: sourceHandle,
        preference,
      },
      { onConflict: "user_id,source_handle" }
    );
  }

  return NextResponse.json({ updated: true });
}
