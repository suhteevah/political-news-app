import { NextRequest, NextResponse } from "next/server";
import { createMobileClient } from "@/lib/supabase/mobile";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body as { email?: string };

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const supabase = await createMobileClient();

    const origin = request.headers.get("origin") || request.nextUrl.origin;
    const redirectTo = `${origin}/auth/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      // Log internally but don't reveal to client whether the email exists
      console.error("Password reset error:", error.message);
    }

    // Always return success to avoid email enumeration
    return NextResponse.json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
