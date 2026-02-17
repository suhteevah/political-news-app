import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch distinct non-null categories from posts
    const { data, error } = await supabase
      .from("posts")
      .select("category")
      .not("category", "is", null)
      .order("category", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      );
    }

    // Deduplicate categories since Supabase select doesn't support DISTINCT directly
    const categories = [...new Set((data ?? []).map((row) => row.category as string))];

    return NextResponse.json({ categories });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/posts/categories:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
