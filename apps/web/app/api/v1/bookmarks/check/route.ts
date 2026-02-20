import { NextRequest, NextResponse } from "next/server";
import { createMobileClient, getMobileUser } from "@/lib/supabase/mobile";

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
    const { post_ids } = body as { post_ids?: string[] };

    if (!Array.isArray(post_ids) || post_ids.length === 0) {
      return NextResponse.json(
        { error: "post_ids must be a non-empty array of strings" },
        { status: 400 }
      );
    }

    if (post_ids.length > 100) {
      return NextResponse.json(
        { error: "Maximum of 100 post_ids per request" },
        { status: 400 }
      );
    }

    // Validate that all entries are strings
    if (!post_ids.every((id) => typeof id === "string" && id.length > 0)) {
      return NextResponse.json(
        { error: "All post_ids must be non-empty strings" },
        { status: 400 }
      );
    }

    const { data: userBookmarks, error: queryError } = await supabase
      .from("bookmarks")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", post_ids);

    if (queryError) {
      console.error("Error checking bookmarks:", queryError.message);
      return NextResponse.json(
        { error: "Failed to check bookmarks" },
        { status: 500 }
      );
    }

    // Build a map of post_id -> true for bookmarked posts
    const bookmarkedSet = new Set(
      (userBookmarks ?? []).map((b) => b.post_id)
    );

    const bookmarked: Record<string, boolean> = {};
    for (const postId of post_ids) {
      bookmarked[postId] = bookmarkedSet.has(postId);
    }

    return NextResponse.json({ bookmarked });
  } catch (err) {
    console.error("Unexpected error in POST /api/v1/bookmarks/check:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
