import { NextResponse } from "next/server";
import { createMobileClient as createClient } from "@/lib/supabase/mobile";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: sources, error } = await supabase
      .from("curated_sources")
      .select("id, x_handle, display_name, category, is_active")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("display_name", { ascending: true });

    if (error) {
      console.error("Error fetching curated sources:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch sources" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sources: sources ?? [] });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/feed-preferences:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
