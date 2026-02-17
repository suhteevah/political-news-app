import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_TARGET_TYPES = ["post", "comment"] as const;
type TargetType = (typeof VALID_TARGET_TYPES)[number];

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const target_type = searchParams.get("target_type");
    const target_ids_param = searchParams.get("target_ids");

    if (
      !target_type ||
      !VALID_TARGET_TYPES.includes(target_type as TargetType)
    ) {
      return NextResponse.json(
        { error: 'target_type query param must be "post" or "comment"' },
        { status: 400 }
      );
    }

    if (!target_ids_param || target_ids_param.trim().length === 0) {
      return NextResponse.json(
        { error: "target_ids query param is required (comma-separated)" },
        { status: 400 }
      );
    }

    const target_ids = target_ids_param
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (target_ids.length === 0) {
      return NextResponse.json({ votes: {} });
    }

    // Cap at 100 IDs per request to prevent abuse
    if (target_ids.length > 100) {
      return NextResponse.json(
        { error: "Maximum of 100 target_ids per request" },
        { status: 400 }
      );
    }

    const { data: userVotes, error: queryError } = await supabase
      .from("votes")
      .select("target_id, value")
      .eq("user_id", user.id)
      .eq("target_type", target_type)
      .in("target_id", target_ids);

    if (queryError) {
      console.error("Error checking votes:", queryError.message);
      return NextResponse.json(
        { error: "Failed to check votes" },
        { status: 500 }
      );
    }

    const votes: Record<string, number> = {};
    for (const vote of userVotes ?? []) {
      votes[vote.target_id] = vote.value;
    }

    return NextResponse.json({ votes });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/votes/check:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
