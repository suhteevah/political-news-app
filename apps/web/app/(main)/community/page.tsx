import { createClient } from "@/lib/supabase/server";
import { CreatePostForm } from "@/components/create-post-form";
import { UserPostCard } from "@/components/user-post-card";

export default async function CommunityPage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("user_posts")
    .select("*, user:profiles(*)")
    .order("created_at", { ascending: false })
    .limit(30);

  // Build a map of user_id -> plan for all post authors with paid plans
  const subscriberPlans = new Map<string, "pro" | "intelligence">();

  if (posts && posts.length > 0) {
    const userIds = [...new Set(posts.map((p) => p.user_id).filter(Boolean))];

    if (userIds.length > 0) {
      const now = new Date();

      // Check Stripe subscriptions
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("user_id, plan, status, current_period_end")
        .in("user_id", userIds)
        .in("status", ["active", "trialing"]);

      if (subs) {
        for (const sub of subs) {
          if (new Date(sub.current_period_end) > now) {
            subscriberPlans.set(sub.user_id, sub.plan as "pro" | "intelligence");
          }
        }
      }

      // Check referral Pro for users not already identified as paid subscribers
      const remainingIds = userIds.filter((id) => !subscriberPlans.has(id));
      if (remainingIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, referral_pro_until")
          .in("id", remainingIds)
          .not("referral_pro_until", "is", null);

        if (profiles) {
          for (const profile of profiles) {
            if (profile.referral_pro_until && new Date(profile.referral_pro_until) > now) {
              subscriberPlans.set(profile.id, "pro");
            }
          }
        }
      }
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Community</h1>
      <CreatePostForm />
      <div className="mt-6 flex flex-col gap-3">
        {posts && posts.length > 0 ? (
          posts.map((post) => (
            <UserPostCard
              key={post.id}
              post={post}
              userPlan={subscriberPlans.get(post.user_id)}
            />
          ))
        ) : (
          <p className="text-center py-16 text-gray-500">
            No community posts yet. Be the first to share your thoughts!
          </p>
        )}
      </div>
    </>
  );
}
