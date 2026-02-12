export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  source: "x" | "user";
  x_tweet_id: string | null;
  x_author_handle: string | null;
  x_author_name: string | null;
  x_author_avatar: string | null;
  content: string;
  media_urls: string[];
  category: string;
  created_at: string;
  upvote_count: number;
  comment_count: number;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  upvote_count: number;
  created_at: string;
  user?: User;
}

export interface Vote {
  id: string;
  user_id: string;
  target_type: "post" | "comment";
  target_id: string;
  value: 1 | -1;
  created_at: string;
}

export interface Forum {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_url: string | null;
  post_count: number;
  member_count: number;
  created_at: string;
}

export interface ForumThread {
  id: string;
  forum_id: string;
  user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  upvote_count: number;
  comment_count: number;
  created_at: string;
  user?: User;
}

export interface CuratedSource {
  id: string;
  x_handle: string;
  display_name: string;
  category: string;
  is_active: boolean;
  added_at: string;
}
