"use client";

import { useState } from "react";

/**
 * Convert a direct video.twimg.com URL to a proxied URL.
 * This avoids the 403 Forbidden from Twitter's CDN which blocks
 * requests with third-party Referer headers.
 */
function proxyVideoUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "video.twimg.com") {
      return `/api/video-proxy?url=${encodeURIComponent(url)}`;
    }
  } catch {
    // If URL parsing fails, return as-is
  }
  return url;
}

interface TweetVideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  tweetUrl: string;
}

/**
 * Inline video player for X/Twitter video tweets.
 * Shows thumbnail with play button -> click -> plays MP4 video inline.
 * Uses a server-side proxy to bypass Twitter CDN's Referer-based blocking.
 */
export function TweetVideoPlayer({
  videoUrl,
  thumbnailUrl,
  tweetUrl,
}: TweetVideoPlayerProps) {
  const [playing, setPlaying] = useState(false);

  const proxiedUrl = proxyVideoUrl(videoUrl);

  if (playing) {
    return (
      <div className="mt-3 rounded-xl overflow-hidden bg-black">
        <video
          src={proxiedUrl}
          controls
          autoPlay
          playsInline
          className="w-full max-h-[500px]"
          poster={thumbnailUrl}
        >
          <a href={tweetUrl} target="_blank" rel="noopener noreferrer">
            Watch on X
          </a>
        </video>
      </div>
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      className="relative block w-full mt-3 rounded-xl overflow-hidden group cursor-pointer"
      aria-label="Play video"
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="w-full object-cover max-h-64 transition-opacity group-hover:opacity-80"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-48 bg-gray-900 flex items-center justify-center">
          <span className="text-gray-500 text-sm">Video</span>
        </div>
      )}
      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-blue-500/90 flex items-center justify-center shadow-2xl group-hover:bg-blue-400 group-hover:scale-110 transition-all duration-150">
          <svg
            className="w-7 h-7 text-white ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      {/* X badge */}
      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1">
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Video
      </div>
    </button>
  );
}

interface ViewOnXButtonProps {
  handle: string;
  tweetId: string;
}

/**
 * Small "View on X" link that opens the original tweet.
 */
export function ViewOnXButton({ handle, tweetId }: ViewOnXButtonProps) {
  const tweetUrl = `https://x.com/${handle}/status/${tweetId}`;

  return (
    <a
      href={tweetUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors"
      title="View on X"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </a>
  );
}
