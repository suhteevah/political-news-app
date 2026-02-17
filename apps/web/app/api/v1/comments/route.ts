import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { post_id, content, parent_id } = body as {
      post_id?: string;
      content?: string;
      parent_id?: string;
    };

    if (!post_id || typeof post_id !== "string") {
      return NextResponse.json(
        { error: "post_id is required" },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "content is required and must be non-empty" },
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
        { status: 400 }
      );
    }

    // If parent_id is provided, verify the parent comment exists and belongs to the same post
    if (parent_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from("comments")
        .select("id, post_id")
        .eq("id", parent_id)
        .single();

      if (parentError || !parentComment) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 400 }
        );
      }

      if (parentComment.post_id !== post_id) {
        return NextResponse.json(
          { error: "Parent comment does not belong to the specified post" },
          { status: 400 }
        );
      }
    }

    const { data: comment, error: insertError } = await supabase
      .from("comments")
      .insert({
        post_id,
        user_id: user.id,
        content: content.trim(),
        parent_id: parent_id || null,
      })
      .select(
        "id, post_id, user_id, content, parent_id, upvote_count, created_at"
      )
      .single();

    if (insertError) {
      console.error("Error creating comment:", insertError.message);
      return NextResponse.json(
        { error: "Failed to create comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/v1/comments:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
