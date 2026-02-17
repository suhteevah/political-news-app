import { createClient } from "@/lib/supabase/server";
import { CategoryTabs } from "@/components/category-tabs";
import { PostCard } from "@/components/post-card";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { FEED_PAGE_SIZE } from "@repo/shared";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);

  if (category) {
    query = query.eq("category", category);
  }

  const { data: posts } = await query;

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
