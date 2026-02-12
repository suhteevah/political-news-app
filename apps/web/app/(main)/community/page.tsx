import { createClient } from "@/lib/supabase/server";
import { CreatePostForm } from "@/components/create-post-form";
import { UserPostCard } from "@/components/user-post-card";

export default async function CommunityPage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("user_posts")
    .select("*, user:profiles(*)")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Community</h1>
      <CreatePostForm />
      <div className="mt-6 flex flex-col gap-3">
        {posts && posts.length > 0 ? (
          posts.map((post) => <UserPostCard key={post.id} post={post} />)
        ) : (
          <p className="text-center py-16 text-gray-500">
            No community posts yet. Be the first to share your thoughts!
          </p>
        )}
      </div>
    </>
  );
}
