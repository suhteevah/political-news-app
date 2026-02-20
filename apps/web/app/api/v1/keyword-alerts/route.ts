import { NextRequest, NextResponse } from "next/server";
import { createMobileClient, getMobileUser } from "@/lib/supabase/mobile";
import { getUserPlan } from "@/lib/get-user-plan";

const MAX_ALERTS_PER_USER = 20;

export async function GET() {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const plan = await getUserPlan(user.id);
    if (plan === "free") {
      return NextResponse.json(
        { error: "Wire Pro or Intelligence subscription required" },
        { status: 403 }
      );
    }

    const supabase = await createMobileClient();

    const { data: alerts, error } = await supabase
      .from("keyword_alerts")
      .select("id, user_id, keywords, is_active, last_triggered_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching keyword alerts:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch keyword alerts" },
        { status: 500 }
      );
    }

    return NextResponse.json({ alerts: alerts ?? [] });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/keyword-alerts:", err);
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
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const plan = await getUserPlan(user.id);
    if (plan === "free") {
      return NextResponse.json(
        { error: "Wire Pro or Intelligence subscription required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { keywords, is_active } = body as {
      keywords?: string[];
      is_active?: boolean;
    };

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: "keywords is required and must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate each keyword is a non-empty string
    const cleanKeywords = keywords
      .filter((k) => typeof k === "string" && k.trim().length > 0)
      .map((k) => k.trim());

    if (cleanKeywords.length === 0) {
      return NextResponse.json(
        { error: "At least one valid keyword is required" },
        { status: 400 }
      );
    }

    const supabase = await createMobileClient();

    // Check existing alert count
    const { count, error: countError } = await supabase
      .from("keyword_alerts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      console.error("Error counting keyword alerts:", countError.message);
      return NextResponse.json(
        { error: "Failed to check alert limit" },
        { status: 500 }
      );
    }

    if ((count ?? 0) >= MAX_ALERTS_PER_USER) {
      return NextResponse.json(
        {
          error: `Maximum of ${MAX_ALERTS_PER_USER} keyword alerts reached`,
          limit: MAX_ALERTS_PER_USER,
        },
        { status: 400 }
      );
    }

    const { data: alert, error: insertError } = await supabase
      .from("keyword_alerts")
      .insert({
        user_id: user.id,
        keywords: cleanKeywords,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select(
        "id, user_id, keywords, is_active, last_triggered_at, created_at"
      )
      .single();

    if (insertError) {
      console.error("Error creating keyword alert:", insertError.message);
      return NextResponse.json(
        { error: "Failed to create keyword alert" },
        { status: 500 }
      );
    }

    return NextResponse.json({ alert }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/v1/keyword-alerts:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const plan = await getUserPlan(user.id);
    if (plan === "free") {
      return NextResponse.json(
        { error: "Wire Pro or Intelligence subscription required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, keywords, is_active } = body as {
      id?: string;
      keywords?: string[];
      is_active?: boolean;
    };

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Alert id is required" },
        { status: 400 }
      );
    }

    // Build update payload
    const updates: Record<string, unknown> = {};

    if (keywords !== undefined) {
      if (!Array.isArray(keywords) || keywords.length === 0) {
        return NextResponse.json(
          { error: "keywords must be a non-empty array" },
          { status: 400 }
        );
      }
      const cleanKeywords = keywords
        .filter((k) => typeof k === "string" && k.trim().length > 0)
        .map((k) => k.trim());
      if (cleanKeywords.length === 0) {
        return NextResponse.json(
          { error: "At least one valid keyword is required" },
          { status: 400 }
        );
      }
      updates.keywords = cleanKeywords;
    }

    if (is_active !== undefined) {
      updates.is_active = is_active;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const supabase = await createMobileClient();

    const { data: alert, error } = await supabase
      .from("keyword_alerts")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select(
        "id, user_id, keywords, is_active, last_triggered_at, created_at"
      )
      .single();

    if (error) {
      console.error("Error updating keyword alert:", error.message);
      return NextResponse.json(
        { error: "Failed to update keyword alert. Alert not found or not owned by you." },
        { status: 404 }
      );
    }

    return NextResponse.json({ alert });
  } catch (err) {
    console.error("Unexpected error in PUT /api/v1/keyword-alerts:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const plan = await getUserPlan(user.id);
    if (plan === "free") {
      return NextResponse.json(
        { error: "Wire Pro or Intelligence subscription required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body as { id?: string };

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Alert id is required" },
        { status: 400 }
      );
    }

    const supabase = await createMobileClient();

    const { error } = await supabase
      .from("keyword_alerts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting keyword alert:", error.message);
      return NextResponse.json(
        { error: "Failed to delete keyword alert" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in DELETE /api/v1/keyword-alerts:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
