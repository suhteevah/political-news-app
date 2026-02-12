import { createClient } from "@/lib/supabase/server";
import { HighlightPicker } from "@/components/highlight-picker";

export default async function HighlightsPage() {
  const supabase = await createClient();

  // Get today's top posts sorted by upvotes
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, x_author_handle, x_author_name, category, upvote_count, created_at")
    .eq("source", "x")
    .gte("created_at", today.toISOString())
    .order("upvote_count", { ascending: false })
    .limit(50);

  return (
    <>
      <h1 className="text-2xl font-bold mb-2">Daily Highlights</h1>
      <p className="text-sm text-gray-400 mb-6">
        Select stories for your YouTube video script. Click "Copy as Script" when ready.
      </p>
      {posts && posts.length > 0 ? (
        <HighlightPicker posts={posts} />
      ) : (
        <p className="text-center py-16 text-gray-500">
          No posts from today yet. Run a fetch first.
        </p>
      )}
    </>
  );
}
