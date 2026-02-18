import type { Comment } from "@repo/shared";
import { VoteButton } from "./vote-button";
import { WireBadge } from "./wire-badge";
import { ProBadge } from "./pro-badge";

export function CommentCard({
  comment,
  userPlan,
}: {
  comment: Comment;
  userPlan?: "pro" | "intelligence";
}) {
  const timeAgo = getTimeAgo(new Date(comment.created_at));
  const isWire =
    comment.user?.username === "wire" || comment.user?.is_bot === true;

  return (
    <div
      className={`border-l-2 pl-4 py-2 ${
        isWire ? "border-l-amber-600" : "border-gray-800"
      }`}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold">
          {comment.user?.display_name ?? "Anonymous"}
        </span>
        {isWire && <WireBadge />}
        {!isWire && userPlan && <ProBadge plan={userPlan} />}
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
