import { createClient } from "@/lib/supabase/server";
import { CommentCard } from "./comment-card";
import { CommentForm } from "./comment-form";

export async function CommentSection({ postId }: { postId: string }) {
  const supabase = await createClient();

  const { data: comments } = await supabase
    .from("comments")
    .select("*, user:profiles(*)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  // Build a map of user_id -> plan for all commenters with paid plans
  const subscriberPlans = new Map<string, "pro" | "intelligence">();

  if (comments && comments.length > 0) {
    const userIds = [...new Set(comments.map((c) => c.user_id).filter(Boolean))];

    if (userIds.length > 0) {
      // Check Stripe subscriptions
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("user_id, plan, status, current_period_end")
        .in("user_id", userIds)
        .in("status", ["active", "trialing"]);

      const now = new Date();
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
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">Comments</h3>
      <CommentForm postId={postId} />
      <div className="mt-4 flex flex-col gap-3">
        {comments && comments.length > 0 ? (
          comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              userPlan={subscriberPlans.get(comment.user_id)}
            />
          ))
        ) : (
          <p className="text-sm text-gray-500 py-4">
            No comments yet. Be the first to share your thoughts.
          </p>
        )}
      </div>
    </div>
  );
}
