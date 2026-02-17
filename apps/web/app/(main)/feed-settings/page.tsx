import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/get-user-plan";
import { FeedCuration } from "@/components/feed-curation";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function FeedSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const currentPlan = await getUserPlan(user.id);

  // Free users get a teaser, not the full feature
  if (currentPlan === "free") {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold mb-3">Custom Feed Settings</h1>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Wire Pro subscribers can pin their favorite sources and mute the ones
          they don&apos;t want to see. Customize your feed exactly how you want it.
        </p>
        <Link
          href="/pricing"
          className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
        >
          Upgrade to Wire Pro — $6.99/mo
        </Link>
      </div>
    );
  }

  return (
    <div>
      <FeedCuration />
    </div>
  );
}
