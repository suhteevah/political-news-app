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

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">Comments</h3>
      <CommentForm postId={postId} />
      <div className="mt-4 flex flex-col gap-3">
        {comments && comments.length > 0 ? (
          comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
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
