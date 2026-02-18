import { createClient } from "@/lib/supabase/server";
import { AddSourceForm } from "@/components/add-source-form";
import { SourceList } from "@/components/source-list";
import { BreakingAlertForm } from "@/components/breaking-alert-form";
import { WireConfigPanel } from "@/components/wire-config-panel";
import { WireColumnPreview } from "@/components/wire-column-preview";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { redirect } from "next/navigation";

// Hardcoded owner ID — only this user can access admin
const OWNER_USER_ID = "2dea127a-e812-41f1-9e83-95b12710b890"; // Suhteevah

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Reject anyone who is not the site owner
  if (!user || user.id !== OWNER_USER_ID) {
    redirect("/");
  }

  const { data: sources } = await supabase
    .from("curated_sources")
    .select("*")
    .order("added_at", { ascending: false });

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      {/* Analytics Section */}
      <div className="border border-gray-800 rounded-xl p-6 mb-6">
        <AnalyticsDashboard />
      </div>

      {/* Breaking News Alert Section */}
      <div className="border border-red-800/30 rounded-xl p-6 mb-6 bg-red-950/10">
        <BreakingAlertForm />
      </div>

      {/* WIRE AI Configuration */}
      <div className="border border-amber-800/30 rounded-xl p-6 mb-6 bg-amber-950/10">
        <WireConfigPanel />
      </div>

      {/* WIRE Pending Column */}
      <div className="border border-amber-800/30 rounded-xl p-6 mb-6 bg-amber-950/10">
        <WireColumnPreview />
      </div>

      {/* Source Management Section */}
      <div className="border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-3">Manage Sources</h2>
        <AddSourceForm />
        <div className="mt-6">
          <h3 className="text-base font-medium mb-3">
            Current Sources ({sources?.length ?? 0})
          </h3>
          {sources && sources.length > 0 ? (
            <SourceList sources={sources} />
          ) : (
            <p className="text-gray-500">
              No sources configured yet. Add X handles above.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
