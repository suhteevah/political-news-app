import { createClient } from "@/lib/supabase/server";
import { CategoryTabs } from "@/components/category-tabs";
import { PostCard } from "@/components/post-card";
import { FEED_PAGE_SIZE } from "@repo/shared";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);

  if (category) {
    query = query.eq("category", category);
  }

  const { data: posts } = await query;

  return (
    <>
      <CategoryTabs />
      <div className="mt-4 flex flex-col gap-3">
        {posts && posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
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
