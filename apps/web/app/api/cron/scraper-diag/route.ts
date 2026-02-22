import { NextResponse } from "next/server";
import { diagnoseScraper } from "@/lib/scraper";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const handle = url.searchParams.get("handle") || "Breaking911";

  try {
    const result = await diagnoseScraper(handle);
    return NextResponse.json({
      ...result,
      envCheck: {
        hasUsername: !!process.env.TWITTER_USERNAME,
        hasPassword: !!process.env.TWITTER_PASSWORD,
        hasEmail: !!process.env.TWITTER_EMAIL,
        username: process.env.TWITTER_USERNAME,
      },
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      envCheck: {
        hasUsername: !!process.env.TWITTER_USERNAME,
        hasPassword: !!process.env.TWITTER_PASSWORD,
        hasEmail: !!process.env.TWITTER_EMAIL,
        username: process.env.TWITTER_USERNAME,
      },
    }, { status: 500 });
  }
}
