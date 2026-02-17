import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();

    // Fetch the post
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select(
        "id, content, x_author_name, x_author_handle, x_tweet_id, category, created_at, is_breaking, upvote_count, comment_count, external_url, source, source_id"
      )
      .eq("id", id)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Fetch comments for this post, joined with author profiles
    const { data: comments, error: commentsError } = await supabase
      .from("comments")
      .select(
        "id, post_id, user_id, content, parent_id, upvote_count, created_at, profiles(username, display_name, avatar_url)"
      )
      .eq("post_id", id)
      .order("created_at", { ascending: true });

    if (commentsError) {
      console.error("Error fetching comments:", commentsError.message);
      // Return the post even if comments fail
      return NextResponse.json({
        post,
        comments: [],
      });
    }

    return NextResponse.json({
      post,
      comments: comments ?? [],
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/posts/[id]:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
