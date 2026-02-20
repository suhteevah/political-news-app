import { NextRequest, NextResponse } from "next/server";
import { createMobileClient, getMobileUser } from "@/lib/supabase/mobile";

const VALID_TARGET_TYPES = ["post", "comment", "user", "thread"] as const;
type TargetType = (typeof VALID_TARGET_TYPES)[number];

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
    const { target_type, target_id, reason, details } = body as {
      target_type?: string;
      target_id?: string;
      reason?: string;
      details?: string;
    };

    if (
      !target_type ||
      !VALID_TARGET_TYPES.includes(target_type as TargetType)
    ) {
      return NextResponse.json(
        {
          error:
            'target_type must be "post", "comment", "user", or "thread"',
        },
        { status: 400 }
      );
    }

    if (!target_id || typeof target_id !== "string") {
      return NextResponse.json(
        { error: "target_id is required" },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "reason is required and must be non-empty" },
        { status: 400 }
      );
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      target_type,
      target_id,
      reason: reason.trim(),
      status: "pending",
    };

    if (details && typeof details === "string" && details.trim().length > 0) {
      insertData.details = details.trim();
    }

    const { data: report, error: insertError } = await supabase
      .from("reports")
      .insert(insertData)
      .select("id, target_type, target_id, reason, status, created_at")
      .single();

    if (insertError) {
      console.error("Error creating report:", insertError.message);
      return NextResponse.json(
        { error: "Failed to create report" },
        { status: 500 }
      );
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/v1/reports:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
