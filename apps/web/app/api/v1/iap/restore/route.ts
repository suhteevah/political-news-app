import { NextRequest, NextResponse } from "next/server";
import {
  getMobileUser,
  getAdminClient,
} from "@/lib/supabase/mobile";

/**
 * POST /api/v1/iap/restore
 *
 * Restores previously purchased in-app subscriptions. The mobile client
 * sends all known receipts and this endpoint re-activates any that are
 * still valid (i.e. not expired).
 *
 * Body: { receipts: [{ platform, product_id, transaction_id, receipt_data }] }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { receipts } = body as {
      receipts?: Array<{
        platform: string;
        product_id: string;
        transaction_id: string;
        receipt_data: string;
      }>;
    };

    if (!receipts || !Array.isArray(receipts) || receipts.length === 0) {
      return NextResponse.json(
        { error: "receipts array is required and must not be empty" },
        { status: 400 }
      );
    }

    if (receipts.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 receipts per restore request" },
        { status: 400 }
      );
    }

    const admin = getAdminClient();
    const now = new Date();
    const restored: Array<{
      plan: string;
      status: string;
      expires_at: string;
    }> = [];

    for (const receipt of receipts) {
      const { platform, product_id, transaction_id } = receipt;

      // Validate each receipt entry
      if (!transaction_id || typeof transaction_id !== "string") {
        continue;
      }
      if (platform !== "ios" && platform !== "android") {
        continue;
      }
      if (!product_id || typeof product_id !== "string") {
        continue;
      }

      // Look up the receipt in iap_receipts
      const { data: existing, error: lookupError } = await admin
        .from("iap_receipts")
        .select("*")
        .eq("transaction_id", transaction_id)
        .single();

      if (lookupError || !existing) {
        // Receipt not found in our database — skip
        continue;
      }

      // Check if the receipt has expired
      const expiresAt = new Date(existing.expires_at);
      if (expiresAt <= now) {
        // Expired — skip
        continue;
      }

      // Resolve plan from product_id
      const productLower = product_id.toLowerCase();
      let plan: "pro" | "intelligence";
      if (productLower.includes("intelligence")) {
        plan = "intelligence";
      } else if (productLower.includes("pro")) {
        plan = "pro";
      } else {
        continue;
      }

      const source = platform === "ios" ? "iap_apple" : "iap_google";

      // Re-activate the subscription
      const { error: subError } = await admin
        .from("subscriptions")
        .upsert(
          {
            user_id: user.id,
            plan,
            status: "active",
            source,
            current_period_end: existing.expires_at,
            cancel_at_period_end: false,
            stripe_subscription_id: `iap_${transaction_id}`,
          },
          { onConflict: "stripe_subscription_id" }
        );

      if (subError) {
        console.error(
          `Error restoring subscription for tx ${transaction_id}:`,
          subError.message
        );
        continue;
      }

      restored.push({
        plan,
        status: "active",
        expires_at: existing.expires_at,
      });
    }

    // Track analytics event
    if (restored.length > 0) {
      await admin.from("analytics_events").insert({
        event_type: "iap_restored",
        user_id: user.id,
        metadata: { restored_count: restored.length },
      });
    }

    return NextResponse.json({ restored });
  } catch (err) {
    console.error("Unexpected error in POST /api/v1/iap/restore:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
