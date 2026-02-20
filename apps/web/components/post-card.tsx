import type { Post } from "@repo/shared";
import { VoteButton } from "./vote-button";
import { EmbedLinkButton } from "./embed-link-button";
import { WireBadge } from "./wire-badge";
import { YouTubeInlinePlayer, getYouTubeVideoId } from "./video-embed";
import Link from "next/link";

export function PostCard({ post }: { post: Post }) {
  const timeAgo = getTimeAgo(new Date(post.created_at));
  const isWire = post.source === "wire";

  const cardClasses = post.is_breaking
    ? "border-red-800/40 bg-red-950/10 hover:border-red-700/50"
    : isWire
      ? "border-amber-800/40 bg-amber-950/10 hover:border-amber-700/50"
      : "border-gray-800 hover:border-gray-700";

  const youtubeVideoId =
    post.source === "youtube" && post.external_url
      ? getYouTubeVideoId(post.external_url)
      : null;

  return (
    <article className={`border rounded-xl p-4 transition-colors ${cardClasses}`}>
      {post.is_breaking && (
        <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-red-400 uppercase tracking-wider">
          <span>🚨</span>
          <span>Breaking News</span>
        </div>
      )}
      {isWire && !post.is_breaking && (
        <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
          <span>⚡</span>
          <span>WIRE Analysis</span>
        </div>
      )}
      <div className="flex items-start gap-3">
        {isWire ? (
          <div className="w-10 h-10 rounded-full bg-amber-950/50 border border-amber-700/40 flex items-center justify-center text-amber-400 text-lg shrink-0">
            ⚡
          </div>
        ) : (
          post.source === "x" && post.x_author_avatar && (
            <img
              src={post.x_author_avatar}
              alt=""
              className="w-10 h-10 rounded-full shrink-0"
            />
          )
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            {isWire ? (
              <WireBadge size="sm" />
            ) : post.source === "x" || post.source === "rss" || post.source === "youtube" ? (
              <>
                <span className="font-semibold">{post.x_author_name}</span>
                {post.x_author_handle && (
                  <span className="text-gray-500">@{post.x_author_handle}</span>
                )}
              </>
            ) : (
              <span className="font-semibold">Community Post</span>
            )}
            <span className="text-gray-600">·</span>
            <span className="text-gray-500">{timeAgo}</span>
            <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-400">
              {post.category}
            </span>
          </div>
          <p className="mt-2 text-gray-200 whitespace-pre-wrap">{post.content}</p>

          {/* YouTube: inline player (thumbnail → click → plays in place) */}
          {youtubeVideoId && post.external_url && (
            <YouTubeInlinePlayer
              videoId={youtubeVideoId}
              thumbnailUrl={post.media_urls[0]}
              externalUrl={post.external_url}
            />
          )}

          {/* Non-YouTube media: image grid */}
          {!youtubeVideoId && post.media_urls.length > 0 && (
            <div className="mt-3 grid gap-2 grid-cols-2">
              {post.media_urls.slice(0, 4).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="rounded-lg w-full object-cover max-h-64"
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-6 mt-3">
            <VoteButton targetType="post" targetId={post.id} initialCount={post.upvote_count} />
            <Link
              href={`/post/${post.id}`}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {post.comment_count}
            </Link>
            {post.source === "x" && post.x_tweet_id && post.x_author_handle && (
              <EmbedLinkButton handle={post.x_author_handle} tweetId={post.x_tweet_id} />
            )}
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
