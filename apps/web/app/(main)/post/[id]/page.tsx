import { createClient } from "@/lib/supabase/server";
import { PostCard } from "@/components/post-card";
import { CommentSection } from "@/components/comment-section";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("content, x_author_name, x_author_handle, category")
    .eq("id", id)
    .single();

  if (!post) {
    return { title: "Post Not Found — The Right Wire" };
  }

  const snippet = post.content.length > 160
    ? post.content.slice(0, 157) + "..."
    : post.content;

  const author = post.x_author_name || post.x_author_handle || "Community";
  const title = `${author} on ${post.category} — The Right Wire`;

  return {
    title,
    description: snippet,
    openGraph: {
      title,
      description: snippet,
      type: "article",
      siteName: "The Right Wire",
    },
    twitter: {
      card: "summary",
      title,
      description: snippet,
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (!post) notFound();

  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.content.slice(0, 110),
    datePublished: post.created_at,
    author: {
      "@type": "Person",
      name: post.x_author_name || post.x_author_handle || "Community Member",
    },
    publisher: {
      "@type": "Organization",
      name: "The Right Wire",
      url: "https://the-right-wire.com",
    },
    articleSection: post.category,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: post.upvote_count,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: post.comment_count,
      },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PostCard post={post} />
      <CommentSection postId={post.id} />
    </div>
  );
}
