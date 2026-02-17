import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all forums
    const { data: forums, error: forumsError } = await supabase
      .from("forums")
      .select("id, name, slug, description, created_at")
      .order("name", { ascending: true });

    if (forumsError) {
      console.error("Error fetching forums:", forumsError.message);
      return NextResponse.json(
        { error: "Failed to fetch forums" },
        { status: 500 }
      );
    }

    // Get member counts grouped by forum_id
    const { data: counts, error: countsError } = await supabase
      .from("forum_memberships")
      .select("forum_id");

    if (countsError) {
      console.error("Error fetching membership counts:", countsError.message);
      // Return forums without counts rather than failing entirely
      return NextResponse.json({
        forums: (forums ?? []).map((f) => ({ ...f, member_count: 0 })),
      });
    }

    // Tally member counts per forum
    const memberCountMap: Record<string, number> = {};
    for (const row of counts ?? []) {
      memberCountMap[row.forum_id] = (memberCountMap[row.forum_id] || 0) + 1;
    }

    const forumsWithCounts = (forums ?? []).map((forum) => ({
      id: forum.id,
      name: forum.name,
      slug: forum.slug,
      description: forum.description,
      created_at: forum.created_at,
      member_count: memberCountMap[forum.id] || 0,
    }));

    return NextResponse.json({ forums: forumsWithCounts });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/forums:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
