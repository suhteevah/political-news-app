import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1),
      100
    );
    const offset = Math.max(
      parseInt(searchParams.get("offset") || "0", 10) || 0,
      0
    );
    const userId = searchParams.get("user_id");

    const supabase = await createClient();

    let query = supabase
      .from("user_posts")
      .select(
        "id, user_id, content, media_urls, created_at, profiles(username, display_name, avatar_url)",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: posts, count, error } = await query;

    if (error) {
      console.error("Error fetching user posts:", error.message);
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
    console.error("Unexpected error in GET /api/v1/user-posts:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const { content, media_urls } = body as { content?: string; media_urls?: string[] };

    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (content.trim().length > 5000) {
      return NextResponse.json(
        { error: "Content must be 5000 characters or fewer" },
        { status: 400 }
      );
    }

    // Validate media_urls if provided
    const validMediaUrls: string[] = [];
    if (media_urls && Array.isArray(media_urls)) {
      for (const url of media_urls.slice(0, 4)) {
        if (typeof url === "string" && url.startsWith("http")) {
          validMediaUrls.push(url);
        }
      }
    }

    // Insert the new user post
    const insertData: Record<string, unknown> = {
      user_id: user.id,
      content: content.trim(),
    };
    if (validMediaUrls.length > 0) {
      insertData.media_urls = validMediaUrls;
    }

    const { data: post, error: insertError } = await supabase
      .from("user_posts")
      .insert(insertData)
      .select("id, user_id, content, media_urls, created_at")
      .single();

    if (insertError) {
      console.error("Error creating user post:", insertError.message);
      return NextResponse.json(
        { error: "Failed to create post" },
        { status: 500 }
      );
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/v1/user-posts:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
