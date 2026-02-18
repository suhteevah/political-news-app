import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getUserPlan } from "@/lib/get-user-plan";
import {
  generateAskResponse,
  getWireConfig,
  isWireEnabled,
} from "@/lib/wire-ai";

const WIRE_USER_ID = process.env.WIRE_USER_ID!;

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
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

    // Parse and validate body
    const body = await request.json();
    const { post_id, question, parent_comment_id } = body as {
      post_id?: string;
      question?: string;
      parent_comment_id?: string;
    };

    if (!post_id || typeof post_id !== "string") {
      return NextResponse.json(
        { error: "post_id is required" },
        { status: 400 }
      );
    }

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json(
        { error: "question is required" },
        { status: 400 }
      );
    }

    if (question.length > 500) {
      return NextResponse.json(
        { error: "Question must be 500 characters or less" },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    // Check if WIRE is enabled
    const enabled = await isWireEnabled(admin);
    if (!enabled) {
      return NextResponse.json(
        { error: "WIRE is currently offline" },
        { status: 503 }
      );
    }

    // Get user plan for rate limiting
    const userPlan = await getUserPlan(user.id);

    // Get rate limit config values
    const limitKey =
      userPlan === "intelligence"
        ? "daily_ask_limit_intelligence"
        : userPlan === "pro"
          ? "daily_ask_limit_pro"
          : "daily_ask_limit_free";

    const userDailyLimit = (await getWireConfig(admin, limitKey)) ?? 3;
    const siteWideCap =
      (await getWireConfig(admin, "site_wide_daily_ask_cap")) ?? 500;
    const commentatorModel =
      (await getWireConfig(admin, "commentator_model")) ?? "haiku";
    const factsModel =
      (await getWireConfig(admin, "facts_model")) ?? "sonnet";

    // Count today's interactions for this user
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { count: userCount, error: userCountError } = await admin
      .from("wire_interactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", todayStart.toISOString());

    if (userCountError) {
      console.error("Error checking user rate limit:", userCountError.message);
      return NextResponse.json(
        { error: "Failed to check rate limit" },
        { status: 500 }
      );
    }

    if ((userCount ?? 0) >= userDailyLimit) {
      return NextResponse.json(
        {
          error: "Daily Ask WIRE limit reached",
          limit: userDailyLimit,
          plan: userPlan,
        },
        { status: 429 }
      );
    }

    // Count today's total site-wide interactions
    const { count: siteCount, error: siteCountError } = await admin
      .from("wire_interactions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString());

    if (siteCountError) {
      console.error("Error checking site-wide cap:", siteCountError.message);
      return NextResponse.json(
        { error: "Failed to check rate limit" },
        { status: 500 }
      );
    }

    if ((siteCount ?? 0) >= siteWideCap) {
      return NextResponse.json(
        { error: "WIRE is taking a break. Try again tomorrow." },
        { status: 429 }
      );
    }

    // Get the post for context
    const { data: post, error: postError } = await admin
      .from("posts")
      .select("content, category")
      .eq("id", post_id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Generate AI response
    const aiResponse = await generateAskResponse(
      question.trim(),
      (post.content || "").slice(0, 100),
      post.category,
      commentatorModel,
      factsModel
    );

    // Insert WIRE's response as a comment
    const { data: comment, error: commentError } = await admin
      .from("comments")
      .insert({
        post_id,
        user_id: WIRE_USER_ID,
        content: aiResponse.response,
        parent_id: parent_comment_id || null,
      })
      .select(
        "id, post_id, user_id, content, parent_id, upvote_count, created_at"
      )
      .single();

    if (commentError) {
      console.error("Error inserting WIRE comment:", commentError.message);
      return NextResponse.json(
        { error: "Failed to post WIRE's response" },
        { status: 500 }
      );
    }

    // Record interaction for rate limiting and analytics
    const { error: interactionError } = await admin
      .from("wire_interactions")
      .insert({
        user_id: user.id,
        post_id,
        question: question.trim(),
        response: aiResponse.response,
        mode: aiResponse.mode,
        model: aiResponse.model,
        input_tokens: aiResponse.inputTokens,
        output_tokens: aiResponse.outputTokens,
      });

    if (interactionError) {
      console.error(
        "Error recording wire interaction:",
        interactionError.message
      );
    }

    // Track analytics event
    await admin.from("analytics_events").insert({
      event_type: "wire_ask",
      user_id: user.id,
      metadata: {
        post_id,
        mode: aiResponse.mode,
      },
    });

    return NextResponse.json({ comment, mode: aiResponse.mode });
  } catch (err) {
    console.error("Unexpected error in POST /api/v1/wire/ask:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
