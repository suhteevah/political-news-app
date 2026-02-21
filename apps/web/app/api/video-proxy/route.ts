import { NextRequest, NextResponse } from "next/server";

/**
 * Video proxy for Twitter/X video CDN.
 *
 * Twitter's video CDN (video.twimg.com) returns HTTP 403 when it receives
 * a third-party Referer header. Browsers send the page's origin as the
 * Referer when a <video> element fetches its src — referrerpolicy on
 * <video> is not reliably honoured across all browsers.
 *
 * This proxy fetches the video server-side (no Referer sent) and streams
 * it back to the client from our own domain, bypassing the CDN restriction.
 *
 * Usage: GET /api/video-proxy?url=https://video.twimg.com/...
 *
 * Security: Only allows video.twimg.com URLs to prevent open-proxy abuse.
 */

const ALLOWED_HOST = "video.twimg.com";

// Cache proxied video responses for 1 hour on Vercel edge, 7 days in browser
const CACHE_CONTROL = "public, max-age=86400, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Validate the URL is a Twitter video CDN URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (parsed.hostname !== ALLOWED_HOST) {
    return NextResponse.json(
      { error: "Only video.twimg.com URLs are allowed" },
      { status: 403 }
    );
  }

  // Support range requests for seeking in video
  const rangeHeader = request.headers.get("range");

  try {
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (compatible; RightWireBot/1.0)",
    };

    if (rangeHeader) {
      headers["Range"] = rangeHeader;
    }

    const upstream = await fetch(url, {
      headers,
      // Don't send referrer
      referrerPolicy: "no-referrer",
    });

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: upstream.status }
      );
    }

    // Build response headers
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", upstream.headers.get("content-type") || "video/mp4");
    responseHeaders.set("Cache-Control", CACHE_CONTROL);
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    // Forward content-length if present
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    // Forward range response headers for seeking
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange);
    }

    const acceptRanges = upstream.headers.get("accept-ranges");
    if (acceptRanges) {
      responseHeaders.set("Accept-Ranges", acceptRanges);
    }

    return new NextResponse(upstream.body, {
      status: upstream.status, // 200 or 206 for partial content
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[video-proxy] Fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch video" },
      { status: 502 }
    );
  }
}
