import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, getAdminClient } from "@/lib/supabase/mobile";

export async function POST(request: NextRequest) {
  try {
    const user = await getMobileUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { confirmation } = body as { confirmation?: string };

    if (confirmation !== "DELETE") {
      return NextResponse.json(
        {
          error:
            'You must send { "confirmation": "DELETE" } to confirm account deletion.',
        },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      console.error("Account deletion error:", error.message);
      return NextResponse.json(
        { error: "Failed to delete account. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Account deleted successfully.",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
