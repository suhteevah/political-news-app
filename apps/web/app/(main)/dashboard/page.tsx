import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/get-user-plan";
import { redirect } from "next/navigation";
import Link from "next/link";
import { IntelligenceDashboard } from "@/components/intelligence-dashboard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const currentPlan = await getUserPlan(user.id);

  if (currentPlan !== "intelligence") {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold mb-3">Wire Intelligence Dashboard</h1>
        <p className="text-gray-400 mb-2 max-w-lg mx-auto">
          Get daily Intelligence Briefs, keyword alerts, trend analysis, and
          data exports. The ultimate tool for political news power users.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          {currentPlan === "pro"
            ? "You're on Wire Pro. Upgrade to Intelligence for the full dashboard."
            : "Subscribe to Wire Intelligence to unlock this feature."}
        </p>
        <Link
          href="/pricing"
          className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
        >
          {currentPlan === "pro"
            ? "Upgrade to Intelligence — $19.99/mo"
            : "Get Wire Intelligence — $19.99/mo"}
        </Link>
      </div>
    );
  }

  return <IntelligenceDashboard />;
}
