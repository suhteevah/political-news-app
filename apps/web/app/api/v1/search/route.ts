import { NextRequest, NextResponse } from "next/server";
import { createMobileClient } from "@/lib/supabase/mobile";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q");
    if (!q || typeof q !== "string" || q.trim().length === 0) {
      return NextResponse.json(
        { error: "Search query 'q' is required" },
        { status: 400 }
      );
    }

    const type = searchParams.get("type") || "posts";
    if (!["posts", "users", "forums"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'posts', 'users', or 'forums'" },
        { status: 400 }
      );
    }

    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1),
      100
    );
    const offset = Math.max(
      parseInt(searchParams.get("offset") || "0", 10) || 0,
      0
    );

    const supabase = await createMobileClient();
    const searchTerm = `%${q.trim()}%`;

    if (type === "posts") {
      const { data, count, error } = await supabase
        .from("posts")
        .select(
          "id, content, x_author_name, x_author_handle, x_tweet_id, category, created_at, is_breaking, upvote_count, comment_count, external_url, source, source_id",
          { count: "exact" }
        )
        .ilike("content", searchTerm)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error searching posts:", error.message);
        return NextResponse.json(
          { error: "Failed to search posts" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        results: data ?? [],
        total: count ?? 0,
        type: "posts",
        limit,
        offset,
      });
    }

    if (type === "users") {
      const { data, count, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio, is_bot", {
          count: "exact",
        })
        .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
        .order("username", { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error searching users:", error.message);
        return NextResponse.json(
          { error: "Failed to search users" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        results: data ?? [],
        total: count ?? 0,
        type: "users",
        limit,
        offset,
      });
    }

    if (type === "forums") {
      const { data, count, error } = await supabase
        .from("forums")
        .select("id, name, slug, description, created_at", {
          count: "exact",
        })
        .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .order("name", { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error searching forums:", error.message);
        return NextResponse.json(
          { error: "Failed to search forums" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        results: data ?? [],
        total: count ?? 0,
        type: "forums",
        limit,
        offset,
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/search:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
