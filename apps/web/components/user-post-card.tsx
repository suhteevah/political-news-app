import { VoteButton } from "./vote-button";

interface UserPostWithProfile {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  upvote_count: number;
  comment_count: number;
  created_at: string;
  user: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export function UserPostCard({ post }: { post: UserPostWithProfile }) {
  const timeAgo = getTimeAgo(new Date(post.created_at));

  return (
    <article className="border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">
          {post.user.display_name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{post.user.display_name}</span>
            <span className="text-gray-500">@{post.user.username}</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500">{timeAgo}</span>
          </div>
          <p className="mt-2 text-gray-200 whitespace-pre-wrap">{post.content}</p>
          <div className="flex items-center gap-6 mt-3">
            <VoteButton targetType="post" targetId={post.id} initialCount={post.upvote_count} />
          </div>
        </div>
      </div>
    </article>
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
