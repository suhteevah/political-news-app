"use client";

import { useState } from "react";

interface EmbedLinkButtonProps {
  handle: string;
  tweetId: string;
}

const EMBED_SERVICES = [
  { name: "FxTwitter", domain: "fxtwitter.com" },
  { name: "VxTwitter", domain: "vxtwitter.com" },
  { name: "FixupX", domain: "fixupx.com" },
] as const;

export function EmbedLinkButton({ handle, tweetId }: EmbedLinkButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  function copyLink(domain: string, name: string) {
    const url = `https://${domain}/${handle}/status/${tweetId}`;
    navigator.clipboard.writeText(url);
    setCopied(name);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        title="Copy embed-friendly link"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-10 min-w-[160px]">
          {EMBED_SERVICES.map((svc) => (
            <button
              key={svc.name}
              onClick={() => copyLink(svc.domain, svc.name)}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              {copied === svc.name ? "Copied!" : svc.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
