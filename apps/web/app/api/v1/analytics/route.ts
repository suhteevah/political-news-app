import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, getAdminClient } from "@/lib/supabase/mobile";

const MAX_EVENTS_PER_BATCH = 50;

export async function POST(request: NextRequest) {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { events } = body as {
      events?: Array<{ event_type: string; metadata?: Record<string, unknown> }>;
    };

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "events is required and must be a non-empty array" },
        { status: 400 }
      );
    }

    if (events.length > MAX_EVENTS_PER_BATCH) {
      return NextResponse.json(
        {
          error: `Maximum of ${MAX_EVENTS_PER_BATCH} events per batch`,
          limit: MAX_EVENTS_PER_BATCH,
        },
        { status: 400 }
      );
    }

    // Validate each event has an event_type
    for (const event of events) {
      if (
        !event.event_type ||
        typeof event.event_type !== "string" ||
        event.event_type.trim().length === 0
      ) {
        return NextResponse.json(
          { error: "Each event must have a non-empty event_type string" },
          { status: 400 }
        );
      }
    }

    const admin = getAdminClient();

    // Build rows with user_id and platform injected into metadata
    const rows = events.map((event) => ({
      event_type: event.event_type.trim(),
      user_id: user.id,
      metadata: {
        ...(event.metadata || {}),
        platform: "mobile",
      },
    }));

    const { error } = await admin.from("analytics_events").insert(rows);

    if (error) {
      console.error("Error inserting analytics events:", error.message);
      return NextResponse.json(
        { error: "Failed to record analytics events" },
        { status: 500 }
      );
    }

    return NextResponse.json({ inserted: rows.length });
  } catch (err) {
    console.error("Unexpected error in POST /api/v1/analytics:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
