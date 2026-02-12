import Link from "next/link";
import { VoteButton } from "./vote-button";

interface ThreadData {
  id: string;
  forum_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  upvote_count: number;
  comment_count: number;
  created_at: string;
  user: {
    username: string;
    display_name: string;
  };
}

export function ThreadCard({
  thread,
  forumSlug,
}: {
  thread: ThreadData;
  forumSlug: string;
}) {
  const timeAgo = getTimeAgo(new Date(thread.created_at));

  return (
    <div className="border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
      {thread.is_pinned && (
        <span className="text-xs text-red-400 font-semibold mb-1 block">
          PINNED
        </span>
      )}
      <h3 className="font-semibold text-gray-100">{thread.title}</h3>
      <p className="mt-1 text-sm text-gray-400 line-clamp-2">{thread.content}</p>
      <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
        <span>by {thread.user?.display_name}</span>
        <span>{timeAgo}</span>
        <VoteButton targetType="post" targetId={thread.id} initialCount={thread.upvote_count} />
        <span>{thread.comment_count} replies</span>
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
