import { NextRequest, NextResponse } from "next/server";
import { createMobileClient, getMobileUser } from "@/lib/supabase/mobile";

export async function GET(request: NextRequest) {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createMobileClient();
    const { searchParams } = new URL(request.url);

    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1),
      100
    );
    const offset = Math.max(
      parseInt(searchParams.get("offset") || "0", 10) || 0,
      0
    );

    // Get total count
    const { count, error: countError } = await supabase
      .from("bookmarks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      console.error("Error counting bookmarks:", countError.message);
      return NextResponse.json(
        { error: "Failed to fetch bookmarks" },
        { status: 500 }
      );
    }

    // Get paginated bookmarks with joined post data
    const { data: bookmarks, error: fetchError } = await supabase
      .from("bookmarks")
      .select(
        `
        id,
        post_id,
        created_at,
        post:posts (
          id,
          content,
          x_author_name,
          x_author_handle,
          category,
          created_at,
          is_breaking,
          upvote_count,
          comment_count,
          source,
          external_url
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      console.error("Error fetching bookmarks:", fetchError.message);
      return NextResponse.json(
        { error: "Failed to fetch bookmarks" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bookmarks: bookmarks ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/bookmarks:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createMobileClient();
    const body = await request.json();
    const { post_id } = body as { post_id?: string };

    if (!post_id || typeof post_id !== "string") {
      return NextResponse.json(
        { error: "post_id is required" },
        { status: 400 }
      );
    }

    // Verify the post exists
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id")
      .eq("id", post_id)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Try to insert; handle UNIQUE constraint (already bookmarked)
    const { data: bookmark, error: insertError } = await supabase
      .from("bookmarks")
      .upsert(
        { user_id: user.id, post_id },
        { onConflict: "user_id,post_id" }
      )
      .select("id, post_id, created_at")
      .single();

    if (insertError) {
      console.error("Error creating bookmark:", insertError.message);
      return NextResponse.json(
        { error: "Failed to create bookmark" },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookmark }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/v1/bookmarks:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
