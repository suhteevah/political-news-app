import { NextResponse, type NextRequest } from "next/server";
import { createMobileClient as createClient } from "@/lib/supabase/mobile";

const VALID_TARGET_TYPES = ["post", "comment"] as const;
type TargetType = (typeof VALID_TARGET_TYPES)[number];

const VALID_VOTE_VALUES = [1, -1] as const;
type VoteValue = (typeof VALID_VOTE_VALUES)[number];

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
    const { target_type, target_id, value } = body as {
      target_type?: string;
      target_id?: string;
      value?: number;
    };

    if (
      !target_type ||
      !VALID_TARGET_TYPES.includes(target_type as TargetType)
    ) {
      return NextResponse.json(
        { error: 'target_type must be "post" or "comment"' },
        { status: 400 }
      );
    }

    if (!target_id || typeof target_id !== "string") {
      return NextResponse.json(
        { error: "target_id is required" },
        { status: 400 }
      );
    }

    if (value === undefined || !VALID_VOTE_VALUES.includes(value as VoteValue)) {
      return NextResponse.json(
        { error: "value must be 1 or -1" },
        { status: 400 }
      );
    }

    // Upsert the vote using the unique constraint on (user_id, target_type, target_id)
    const { data: vote, error: upsertError } = await supabase
      .from("votes")
      .upsert(
        {
          user_id: user.id,
          target_type,
          target_id,
          value,
        },
        {
          onConflict: "user_id,target_type,target_id",
        }
      )
      .select("id, user_id, target_type, target_id, value, created_at")
      .single();

    if (upsertError) {
      console.error("Error upserting vote:", upsertError.message);
      return NextResponse.json(
        { error: "Failed to save vote" },
        { status: 500 }
      );
    }

    return NextResponse.json({ vote });
  } catch (err) {
    console.error("Unexpected error in POST /api/v1/votes:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const { target_type, target_id } = body as {
      target_type?: string;
      target_id?: string;
    };

    if (
      !target_type ||
      !VALID_TARGET_TYPES.includes(target_type as TargetType)
    ) {
      return NextResponse.json(
        { error: 'target_type must be "post" or "comment"' },
        { status: 400 }
      );
    }

    if (!target_id || typeof target_id !== "string") {
      return NextResponse.json(
        { error: "target_id is required" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("votes")
      .delete()
      .eq("user_id", user.id)
      .eq("target_type", target_type)
      .eq("target_id", target_id);

    if (deleteError) {
      console.error("Error deleting vote:", deleteError.message);
      return NextResponse.json(
        { error: "Failed to remove vote" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in DELETE /api/v1/votes:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
