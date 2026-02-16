import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  const { data: postCount } = await supabase
    .from("user_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <div>
      <div className="border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold">
            {profile?.display_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile?.display_name}</h1>
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
      <form action="/api/auth/signout" method="post" className="mt-4">
        <button className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          Sign Out
        </button>
      </form>
    </div>
  );
}
