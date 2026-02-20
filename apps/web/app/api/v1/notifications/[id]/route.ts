import { NextRequest, NextResponse } from "next/server";
import { createMobileClient, getMobileUser } from "@/lib/supabase/mobile";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = createMobileClient(request);
    const user = await getMobileUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    // First verify the notification belongs to the authenticated user
    const { data: notification, error: fetchError } = await supabase
      .from("notifications")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    if (notification.user_id !== user.id) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting notification:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete notification" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Notification DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
