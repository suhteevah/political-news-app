import { VoteButton } from "./vote-button";
import { ProBadge } from "./pro-badge";
import { YouTubeInlinePlayer, getYouTubeVideoId } from "./video-embed";

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

/** Extract the first YouTube URL from text content */
function extractYouTubeUrl(text: string): string | null {
  const match = text.match(
    /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+)/
  );
  return match ? match[0] : null;
}

/** Extract the first X/Twitter URL from text content */
function extractTweetUrl(
  text: string
): { handle: string; tweetId: string; url: string } | null {
  const match = text.match(
    /https?:\/\/(?:(?:www|mobile)\.)?(?:twitter\.com|x\.com)\/([\w]+)\/status\/(\d+)/
  );
  if (!match) return null;
  return { handle: match[1], tweetId: match[2], url: match[0] };
}

export function UserPostCard({
  post,
  userPlan,
}: {
  post: UserPostWithProfile;
  userPlan?: "pro" | "intelligence";
}) {
  const timeAgo = getTimeAgo(new Date(post.created_at));
  const images = post.media_urls?.filter(Boolean) ?? [];

  // Auto-detect YouTube link in post content
  const youtubeUrl = extractYouTubeUrl(post.content);
  const youtubeVideoId = youtubeUrl ? getYouTubeVideoId(youtubeUrl) : null;

  // Auto-detect X/Twitter link in post content
  const tweetLink = extractTweetUrl(post.content);

  return (
    <article className="border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">
          {post.user.display_name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{post.user.display_name}</span>
            {userPlan && <ProBadge plan={userPlan} />}
            <span className="text-gray-500">@{post.user.username}</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500">{timeAgo}</span>
          </div>
          <p className="mt-2 text-gray-200 whitespace-pre-wrap">{post.content}</p>

          {/* YouTube auto-embed from link in content */}
          {youtubeVideoId && youtubeUrl && (
            <YouTubeInlinePlayer
              videoId={youtubeVideoId}
              externalUrl={youtubeUrl}
            />
          )}

          {/* X/Twitter link preview */}
          {!youtubeVideoId && tweetLink && (
            <a
              href={tweetLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>View post on X</span>
              <span className="text-gray-500">@{tweetLink.handle}</span>
            </a>
          )}

          {/* Image grid */}
          {images.length > 0 && (
            <div
              className={`mt-3 grid gap-2 ${
                images.length === 1
                  ? "grid-cols-1"
                  : "grid-cols-2"
              }`}
            >
              {images.slice(0, 4).map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-lg border border-gray-800"
                >
                  <img
                    src={url}
                    alt=""
                    className={`w-full object-cover ${
                      images.length === 1 ? "max-h-96" : "max-h-64"
                    }`}
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          )}

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
