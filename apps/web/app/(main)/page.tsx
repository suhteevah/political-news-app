import { createClient } from "@/lib/supabase/server";
import { CategoryTabs } from "@/components/category-tabs";
import { PostCard } from "@/components/post-card";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { FEED_PAGE_SIZE } from "@repo/shared";
import type { Post } from "@repo/shared";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch more posts than needed so we can filter muted sources and still have enough
  let query = supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE * 2);

  if (category) {
    query = query.eq("category", category);
  }

  const { data: rawPosts } = await query;

  // Apply user source preferences (pin/mute) if logged in
  let posts: Post[] = (rawPosts as Post[]) || [];

  if (user) {
    const { data: prefs } = await supabase
      .from("user_source_preferences")
      .select("source_handle, preference")
      .eq("user_id", user.id);

    if (prefs && prefs.length > 0) {
      const prefMap: Record<string, string> = {};
      prefs.forEach((p) => {
        prefMap[p.source_handle] = p.preference;
      });

      // Filter out muted sources
      posts = posts.filter(
        (p) => !p.x_author_handle || prefMap[p.x_author_handle] !== "muted"
      );

      // Sort: pinned sources first, then by date
      posts.sort((a, b) => {
        const aPinned = a.x_author_handle && prefMap[a.x_author_handle] === "pinned" ? 1 : 0;
        const bPinned = b.x_author_handle && prefMap[b.x_author_handle] === "pinned" ? 1 : 0;

        // Breaking posts always on top
        const aBreaking = a.is_breaking ? 2 : 0;
        const bBreaking = b.is_breaking ? 2 : 0;

        const aPriority = aBreaking + aPinned;
        const bPriority = bBreaking + bPinned;

        if (aPriority !== bPriority) return bPriority - aPriority;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
  }

  // Trim to page size
  posts = posts.slice(0, FEED_PAGE_SIZE);

  // Insert newsletter CTA after the 5th post
  const NEWSLETTER_POSITION = 5;

  return (
    <>
      <CategoryTabs />
      <div className="mt-4 flex flex-col gap-3">
        {posts && posts.length > 0 ? (
          <>
            {posts.map((post, i) => (
              <div key={post.id}>
                <PostCard post={post} />
                {i === NEWSLETTER_POSITION - 1 && (
                  <div className="my-4">
                    <NewsletterSignup userEmail={user?.email} />
                  </div>
                )}
              </div>
            ))}
            {posts.length <= NEWSLETTER_POSITION && (
              <div className="mt-4">
                <NewsletterSignup userEmail={user?.email} />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">No posts yet.</p>
            <p className="mt-2 text-sm">
              Content will appear once X sources are configured and fetched.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
