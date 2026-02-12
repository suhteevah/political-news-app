import type { Comment } from "@repo/shared";
import { VoteButton } from "./vote-button";

export function CommentCard({ comment }: { comment: Comment }) {
  const timeAgo = getTimeAgo(new Date(comment.created_at));

  return (
    <div className="border-l-2 border-gray-800 pl-4 py-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold">
          {comment.user?.display_name ?? "Anonymous"}
        </span>
        <span className="text-gray-500">{timeAgo}</span>
      </div>
      <p className="mt-1 text-gray-300">{comment.content}</p>
      <div className="mt-2">
        <VoteButton
          targetType="comment"
          targetId={comment.id}
          initialCount={comment.upvote_count}
        />
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
