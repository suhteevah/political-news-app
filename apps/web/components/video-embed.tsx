"use client";

import { useState } from "react";

// Extract YouTube video ID from any YouTube URL format
export function getYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      return u.searchParams.get("v");
    }
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1);
    }
  } catch {}
  return null;
}

// YouTube: thumbnail → click → expands to inline player in place
export function YouTubeInlinePlayer({
  videoId,
  thumbnailUrl,
  externalUrl,
}: {
  videoId: string;
  thumbnailUrl?: string;
  externalUrl: string;
}) {
  const [playing, setPlaying] = useState(false);
  const thumb =
    thumbnailUrl ||
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  if (playing) {
    return (
      <div className="mt-3 rounded-xl overflow-hidden aspect-video w-full bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      className="relative block w-full mt-3 rounded-xl overflow-hidden group cursor-pointer"
      aria-label="Play video"
    >
      <img
        src={thumb}
        alt=""
        className="w-full object-cover max-h-56 transition-opacity group-hover:opacity-80"
      />
      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-red-600/90 flex items-center justify-center shadow-2xl group-hover:bg-red-500 group-hover:scale-110 transition-all duration-150">
          <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      {/* YouTube badge */}
      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1">
        <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
        YouTube
      </div>
    </button>
  );
}
