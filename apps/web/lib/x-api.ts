const X_API_BASE = "https://api.x.com/2";

interface XTweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  attachments?: {
    media_keys?: string[];
  };
}

interface XUser {
  id: string;
  name: string;
  username: string;
  profile_image_url: string;
}

interface XMedia {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
}

interface XTimelineResponse {
  data?: XTweet[];
  includes?: {
    users?: XUser[];
    media?: XMedia[];
  };
  meta?: {
    next_token?: string;
    result_count: number;
  };
}

function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}`,
  };
}

export async function getUserIdByUsername(
  username: string
): Promise<string | null> {
  const res = await fetch(`${X_API_BASE}/users/by/username/${username}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data?.id ?? null;
}

export async function getUserRecentTweets(
  userId: string,
  maxResults = 10
): Promise<XTimelineResponse> {
  const params = new URLSearchParams({
    max_results: String(maxResults),
    "tweet.fields": "created_at,attachments",
    expansions: "author_id,attachments.media_keys",
    "user.fields": "name,username,profile_image_url",
    "media.fields": "url,preview_image_url,type",
  });

  const res = await fetch(
    `${X_API_BASE}/users/${userId}/tweets?${params}`,
    { headers: getHeaders() }
  );

  if (!res.ok) {
    console.error("X API error:", res.status, await res.text());
    return {};
  }

  return res.json();
}
