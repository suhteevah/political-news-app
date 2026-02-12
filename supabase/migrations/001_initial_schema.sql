-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- CURATED SOURCES (X/Twitter accounts to follow)
-- ============================================
create table public.curated_sources (
  id uuid primary key default uuid_generate_v4(),
  x_handle text unique not null,
  display_name text not null,
  category text not null default 'Politics',
  is_active boolean default true not null,
  added_at timestamptz default now() not null
);

alter table public.curated_sources enable row level security;

create policy "Curated sources are viewable by everyone"
  on public.curated_sources for select using (true);

-- ============================================
-- POSTS (aggregated content from X + user posts)
-- ============================================
create table public.posts (
  id uuid primary key default uuid_generate_v4(),
  source text not null check (source in ('x', 'user')),
  user_id uuid references public.profiles(id) on delete set null,
  x_tweet_id text unique,
  x_author_handle text,
  x_author_name text,
  x_author_avatar text,
  content text not null,
  media_urls text[] default '{}',
  category text not null default 'Politics',
  upvote_count int default 0 not null,
  comment_count int default 0 not null,
  created_at timestamptz default now() not null
);

create index idx_posts_created_at on public.posts(created_at desc);
create index idx_posts_category on public.posts(category);
create index idx_posts_source on public.posts(source);

alter table public.posts enable row level security;

create policy "Posts are viewable by everyone"
  on public.posts for select using (true);

create policy "Authenticated users can create user posts"
  on public.posts for insert
  with check (auth.uid() is not null and source = 'user' and user_id = auth.uid());

-- ============================================
-- COMMENTS
-- ============================================
create table public.comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  upvote_count int default 0 not null,
  created_at timestamptz default now() not null
);

create index idx_comments_post_id on public.comments(post_id);

alter table public.comments enable row level security;

create policy "Comments are viewable by everyone"
  on public.comments for select using (true);

create policy "Authenticated users can create comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.comments for delete using (auth.uid() = user_id);

-- ============================================
-- VOTES (posts + comments)
-- ============================================
create table public.votes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  value smallint not null check (value in (1, -1)),
  created_at timestamptz default now() not null,
  unique (user_id, target_type, target_id)
);

alter table public.votes enable row level security;

create policy "Votes are viewable by everyone"
  on public.votes for select using (true);

create policy "Authenticated users can vote"
  on public.votes for insert
  with check (auth.uid() = user_id);

create policy "Users can change own votes"
  on public.votes for update using (auth.uid() = user_id);

create policy "Users can remove own votes"
  on public.votes for delete using (auth.uid() = user_id);

-- Trigger: update post upvote_count on vote change
create or replace function public.update_post_vote_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') and new.target_type = 'post' then
    update public.posts set upvote_count = (
      select coalesce(sum(value), 0) from public.votes
      where target_type = 'post' and target_id = new.target_id
    ) where id = new.target_id;
  end if;
  if TG_OP = 'DELETE' and old.target_type = 'post' then
    update public.posts set upvote_count = (
      select coalesce(sum(value), 0) from public.votes
      where target_type = 'post' and target_id = old.target_id
    ) where id = old.target_id;
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger on_vote_change
  after insert or update or delete on public.votes
  for each row execute function public.update_post_vote_count();

-- Trigger: update comment upvote_count on vote change
create or replace function public.update_comment_vote_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') and new.target_type = 'comment' then
    update public.comments set upvote_count = (
      select coalesce(sum(value), 0) from public.votes
      where target_type = 'comment' and target_id = new.target_id
    ) where id = new.target_id;
  end if;
  if TG_OP = 'DELETE' and old.target_type = 'comment' then
    update public.comments set upvote_count = (
      select coalesce(sum(value), 0) from public.votes
      where target_type = 'comment' and target_id = old.target_id
    ) where id = old.target_id;
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger on_comment_vote_change
  after insert or update or delete on public.votes
  for each row execute function public.update_comment_vote_count();

-- Trigger: update post comment_count
create or replace function public.update_post_comment_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set comment_count = comment_count + 1
    where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set comment_count = comment_count - 1
    where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute function public.update_post_comment_count();

-- ============================================
-- FORUMS
-- ============================================
create table public.forums (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  slug text unique not null,
  description text not null,
  icon_url text,
  post_count int default 0 not null,
  member_count int default 0 not null,
  created_at timestamptz default now() not null
);

alter table public.forums enable row level security;

create policy "Forums are viewable by everyone"
  on public.forums for select using (true);

-- ============================================
-- FORUM MEMBERSHIPS
-- ============================================
create table public.forum_memberships (
  id uuid primary key default uuid_generate_v4(),
  forum_id uuid not null references public.forums(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz default now() not null,
  unique (forum_id, user_id)
);

alter table public.forum_memberships enable row level security;

create policy "Memberships are viewable by everyone"
  on public.forum_memberships for select using (true);

create policy "Authenticated users can join forums"
  on public.forum_memberships for insert
  with check (auth.uid() = user_id);

create policy "Users can leave forums"
  on public.forum_memberships for delete using (auth.uid() = user_id);

-- ============================================
-- FORUM THREADS
-- ============================================
create table public.forum_threads (
  id uuid primary key default uuid_generate_v4(),
  forum_id uuid not null references public.forums(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null,
  is_pinned boolean default false not null,
  upvote_count int default 0 not null,
  comment_count int default 0 not null,
  created_at timestamptz default now() not null
);

create index idx_forum_threads_forum_id on public.forum_threads(forum_id);

alter table public.forum_threads enable row level security;

create policy "Threads are viewable by everyone"
  on public.forum_threads for select using (true);

create policy "Authenticated users can create threads"
  on public.forum_threads for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own threads"
  on public.forum_threads for delete using (auth.uid() = user_id);

-- ============================================
-- FOLLOWS (user social feed)
-- ============================================
create table public.follows (
  id uuid primary key default uuid_generate_v4(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique (follower_id, following_id),
  check (follower_id != following_id)
);

alter table public.follows enable row level security;

create policy "Follows are viewable by everyone"
  on public.follows for select using (true);

create policy "Authenticated users can follow"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete using (auth.uid() = follower_id);

-- ============================================
-- USER POSTS (social feed posts by community members)
-- ============================================
create table public.user_posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  media_urls text[] default '{}',
  upvote_count int default 0 not null,
  comment_count int default 0 not null,
  created_at timestamptz default now() not null
);

create index idx_user_posts_user_id on public.user_posts(user_id);
create index idx_user_posts_created_at on public.user_posts(created_at desc);

alter table public.user_posts enable row level security;

create policy "User posts are viewable by everyone"
  on public.user_posts for select using (true);

create policy "Authenticated users can create posts"
  on public.user_posts for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.user_posts for delete using (auth.uid() = user_id);

-- ============================================
-- SEED: Default forums
-- ============================================
insert into public.forums (name, slug, description) values
  ('General Discussion', 'general', 'Talk about anything political'),
  ('Breaking News', 'breaking-news', 'Real-time discussion of breaking stories'),
  ('Memes & Humor', 'memes', 'Political memes and humor'),
  ('Policy & Legislation', 'policy', 'Deep dives into policy and legislation'),
  ('Elections', 'elections', 'Campaign discussion, polls, and election analysis'),
  ('Media Watch', 'media-watch', 'Calling out mainstream media bias');
