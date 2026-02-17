import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/get-user-plan";
import { ManageSubscriptionButton } from "@/components/manage-subscription-button";
import { ReferralCard } from "@/components/referral-card";
import { AlertPreferences } from "@/components/alert-preferences";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const currentPlan = await getUserPlan(user.id);

  const planLabels = {
    free: "Free",
    pro: "Wire Pro",
    intelligence: "Wire Intelligence",
  };

  const planColors = {
    free: "text-gray-400",
    pro: "text-red-400",
    intelligence: "text-yellow-400",
  };

  return (
    <div>
      <div className="border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold">
            {profile?.display_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {profile?.display_name}
              {currentPlan === "pro" && (
                <span className="ml-2 text-xs bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full font-normal">
                  PRO
                </span>
              )}
              {currentPlan === "intelligence" && (
                <span className="ml-2 text-xs bg-yellow-600/20 text-yellow-400 px-2 py-0.5 rounded-full font-normal">
                  INTELLIGENCE
                </span>
              )}
            </h1>
            <p className="text-gray-400">@{profile?.username}</p>
          </div>
        </div>
        {profile?.bio && (
          <p className="mt-4 text-gray-300">{profile.bio}</p>
        )}
        <div className="mt-4 flex gap-6 text-sm text-gray-400">
          <span>Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "Unknown"}</span>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="mt-4 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-3">Subscription</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className={`font-medium ${planColors[currentPlan]}`}>
              {planLabels[currentPlan]}
            </p>
            {currentPlan === "free" && (
              <p className="text-sm text-gray-500 mt-1">
                Upgrade to Wire Pro for breaking alerts, custom feeds, and more.
              </p>
            )}
          </div>
          {currentPlan === "free" ? (
            <Link
              href="/pricing"
              className="text-sm px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Upgrade
            </Link>
          ) : (
            <ManageSubscriptionButton />
          )}
        </div>
      </div>

      {/* Email Preferences (Pro+ only) */}
      {currentPlan !== "free" && (
        <div className="mt-4">
          <AlertPreferences />
        </div>
      )}

      {/* Referral Section */}
      <div className="mt-4">
        <ReferralCard />
      </div>

      <form action="/api/auth/signout" method="post" className="mt-4">
        <button className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          Sign Out
        </button>
      </form>
    </div>
  );
}
