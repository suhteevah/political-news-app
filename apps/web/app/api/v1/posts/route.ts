import { NextResponse, type NextRequest } from "next/server";
import { createMobileClient as createClient } from "@/lib/supabase/mobile";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);
    const category = searchParams.get("category");
    const source = searchParams.get("source");
    const breaking = searchParams.get("breaking");
    const sort = searchParams.get("sort") || "latest";
    const q = searchParams.get("q");

    const supabase = await createClient();

    let query = supabase
      .from("posts")
      .select(
        "id, content, x_author_name, x_author_handle, x_tweet_id, category, created_at, is_breaking, upvote_count, comment_count, external_url, source, source_id",
        { count: "exact" }
      );

    if (category) {
      query = query.eq("category", category);
    }

    if (source) {
      query = query.eq("source", source);
    }

    if (breaking === "true") {
      query = query.eq("is_breaking", true);
    }

    if (q) {
      query = query.ilike("content", `%${q}%`);
    }

    if (sort === "top") {
      query = query.order("upvote_count", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data: posts, count, error } = await query;

    if (error) {
      console.error("Error fetching posts:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch posts" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      posts: posts ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/posts:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
