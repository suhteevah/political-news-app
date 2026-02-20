import { NextRequest, NextResponse } from "next/server";
import {
  getMobileUser,
  getAdminClient,
} from "@/lib/supabase/mobile";

/**
 * POST /api/v1/iap/validate
 *
 * Validates an Apple or Google in-app purchase receipt and activates the
 * corresponding subscription for the authenticated user.
 *
 * Body: { platform, product_id, transaction_id, receipt_data }
 *
 * TODO: Implement server-side receipt validation with Apple App Store
 *       Server API (https://developer.apple.com/documentation/appstoreserverapi)
 *       and Google Play Developer API (https://developers.google.com/android-publisher).
 *       Currently the receipt is trusted as-is and stored directly.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { platform, product_id, transaction_id, receipt_data } = body as {
      platform?: string;
      product_id?: string;
      transaction_id?: string;
      receipt_data?: string;
    };

    // Validate required fields
    if (!platform || (platform !== "ios" && platform !== "android")) {
      return NextResponse.json(
        { error: "platform must be 'ios' or 'android'" },
        { status: 400 }
      );
    }

    if (!product_id || typeof product_id !== "string") {
      return NextResponse.json(
        { error: "product_id is required" },
        { status: 400 }
      );
    }

    if (!transaction_id || typeof transaction_id !== "string") {
      return NextResponse.json(
        { error: "transaction_id is required" },
        { status: 400 }
      );
    }

    if (!receipt_data || typeof receipt_data !== "string") {
      return NextResponse.json(
        { error: "receipt_data is required" },
        { status: 400 }
      );
    }

    // Resolve plan from product_id
    const productLower = product_id.toLowerCase();
    let plan: "pro" | "intelligence";
    if (productLower.includes("intelligence")) {
      plan = "intelligence";
    } else if (productLower.includes("pro")) {
      plan = "pro";
    } else {
      return NextResponse.json(
        { error: "Unrecognized product_id — must contain 'pro' or 'intelligence'" },
        { status: 400 }
      );
    }

    // Determine subscription period from product_id
    const isYearly = productLower.includes("yearly");
    const now = new Date();
    const periodEnd = new Date(now);
    if (isYearly) {
      periodEnd.setDate(periodEnd.getDate() + 365);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    const source = platform === "ios" ? "iap_apple" : "iap_google";
    const admin = getAdminClient();

    // 1. Upsert IAP receipt record
    const { error: receiptError } = await admin
      .from("iap_receipts")
      .upsert(
        {
          user_id: user.id,
          platform,
          product_id,
          transaction_id,
          receipt_data,
          validated_at: now.toISOString(),
          expires_at: periodEnd.toISOString(),
        },
        { onConflict: "transaction_id" }
      );

    if (receiptError) {
      console.error("Error upserting iap_receipt:", receiptError.message);
      return NextResponse.json(
        { error: "Failed to store receipt" },
        { status: 500 }
      );
    }

    // 2. Upsert subscription record
    const { error: subError } = await admin
      .from("subscriptions")
      .upsert(
        {
          user_id: user.id,
          plan,
          status: "active",
          source,
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          stripe_subscription_id: `iap_${transaction_id}`,
        },
        { onConflict: "stripe_subscription_id" }
      );

    if (subError) {
      console.error("Error upserting subscription:", subError.message);
      return NextResponse.json(
        { error: "Failed to activate subscription" },
        { status: 500 }
      );
    }

    // Track analytics event
    await admin.from("analytics_events").insert({
      event_type: "iap_validated",
      user_id: user.id,
      metadata: { platform, product_id, transaction_id, plan, source },
    });

    return NextResponse.json({
      subscription: {
        plan,
        status: "active",
        current_period_end: periodEnd.toISOString(),
        source,
      },
    });
  } catch (err) {
    console.error("Unexpected error in POST /api/v1/iap/validate:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
