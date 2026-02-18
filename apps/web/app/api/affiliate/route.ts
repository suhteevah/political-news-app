import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: commissions } = await supabase
    .from("affiliate_commissions")
    .select("*")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  const totalEarned = (commissions || [])
    .filter(c => c.status === "pending" || c.status === "paid")
    .reduce((sum, c) => sum + c.amount_cents, 0);

  const totalPaid = (commissions || [])
    .filter(c => c.status === "paid")
    .reduce((sum, c) => sum + c.amount_cents, 0);

  return NextResponse.json({
    commissions: commissions || [],
    totalEarned,
    totalPaid,
    totalPending: totalEarned - totalPaid,
  });
}
