import { NextResponse, type NextRequest } from "next/server";
import { createMobileClient as createClient } from "@/lib/supabase/mobile";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);

    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1),
      100
    );
    const offset = Math.max(
      parseInt(searchParams.get("offset") || "0", 10) || 0,
      0
    );

    const supabase = await createClient();

    // Look up the forum by slug
    const { data: forum, error: forumError } = await supabase
      .from("forums")
      .select("id, name, slug, description, created_at")
      .eq("slug", slug)
      .single();

    if (forumError || !forum) {
      return NextResponse.json(
        { error: "Forum not found" },
        { status: 404 }
      );
    }

    // Get member count for this forum
    const { count: memberCount } = await supabase
      .from("forum_memberships")
      .select("id", { count: "exact", head: true })
      .eq("forum_id", forum.id);

    // Get threads for this forum with author profiles
    const { data: threads, count, error: threadsError } = await supabase
      .from("forum_threads")
      .select(
        "id, forum_id, user_id, title, content, is_pinned, created_at, profiles(username, display_name, avatar_url)",
        { count: "exact" }
      )
      .eq("forum_id", forum.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (threadsError) {
      console.error("Error fetching threads:", threadsError.message);
      return NextResponse.json(
        { error: "Failed to fetch threads" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      forum: {
        ...forum,
        member_count: memberCount ?? 0,
      },
      threads: threads ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/forums/[slug]:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
