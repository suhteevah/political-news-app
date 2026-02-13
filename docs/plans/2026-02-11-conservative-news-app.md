# Conservative News Community App - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a conservative political news aggregation app with community features (comments, upvotes, social feed, forums) powered by X/Twitter API content, with web and mobile clients.

**Architecture:** Turborepo monorepo with a Next.js 15 web app and an Expo React Native mobile app sharing a common UI/logic package. Supabase handles auth, database (Postgres), and realtime subscriptions. A Next.js API route layer handles X API integration, content curation, and scheduled fetching via cron. Content from curated X accounts is fetched on a schedule, stored in Supabase, and displayed to users with community interaction features.

**Tech Stack:** Next.js 15 (App Router), Supabase (Auth + Postgres + Realtime), Expo/React Native, Turborepo, Tailwind CSS, TypeScript, X API v2

---

## Phase 1: Project Scaffolding & Monorepo Setup

### Task 1: Initialize Turborepo Monorepo

**Files:**
- Create: `package.json` (root)
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `apps/` (directory)
- Create: `packages/` (directory)

**Step 1: Initialize git repo**

```bash
cd "J:/political news app"
git init
```

**Step 2: Create root package.json**

Create `package.json`:
```json
{
  "name": "conservative-news-app",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "dev:web": "turbo dev --filter=web",
    "dev:mobile": "turbo dev --filter=mobile"
  },
  "devDependencies": {
    "turbo": "^2"
  },
  "packageManager": "npm@11.8.0"
}
```

**Step 3: Create turbo.json**

Create `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {}
  }
}
```

**Step 4: Create .gitignore**

Create `.gitignore`:
```
node_modules/
.next/
.expo/
dist/
.env
.env.local
.turbo/
*.tsbuildinfo
```

**Step 5: Create .env.example**

Create `.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
X_API_BEARER_TOKEN=
```

**Step 6: Install root dependencies**

Run: `cd "J:/political news app" && npm install`
Expected: `node_modules/` created, `package-lock.json` generated

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: initialize turborepo monorepo"
```

---

### Task 2: Scaffold Next.js Web App

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/globals.css`

**Step 1: Create apps/web directory and package.json**

Create `apps/web/package.json`:
```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "@supabase/supabase-js": "^2",
    "@supabase/ssr": "^0.6"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4",
    "vitest": "^3",
    "eslint": "^9",
    "eslint-config-next": "^15"
  }
}
```

**Step 2: Create next.config.ts**

Create `apps/web/next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/shared"],
};

export default nextConfig;
```

**Step 3: Create tsconfig.json**

Create `apps/web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"],
      "@repo/shared": ["../../packages/shared/src"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 4: Create Tailwind v4 + PostCSS config**

Create `apps/web/postcss.config.mjs`:
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

Create `apps/web/app/globals.css`:
```css
@import "tailwindcss";
```

**Step 5: Create root layout**

Create `apps/web/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Right Wire",
  description: "Conservative news, commentary, and community",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Step 6: Create homepage placeholder**

Create `apps/web/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-5xl font-bold tracking-tight">The Right Wire</h1>
      <p className="mt-4 text-xl text-gray-400">
        Conservative news and community — coming soon.
      </p>
    </main>
  );
}
```

**Step 7: Install dependencies and verify dev server**

Run: `cd "J:/political news app" && npm install`
Run: `cd "J:/political news app/apps/web" && npx next dev --turbopack`
Expected: Dev server starts on http://localhost:3000, page renders with title

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 web app with Tailwind v4"
```

---

### Task 3: Create Shared Package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/constants.ts`

**Step 1: Create shared package.json**

Create `packages/shared/package.json`:
```json
{
  "name": "@repo/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint .",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5",
    "vitest": "^3"
  }
}
```

**Step 2: Create tsconfig.json**

Create `packages/shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["esnext"],
    "strict": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create core types**

Create `packages/shared/src/types/index.ts`:
```typescript
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
```

**Step 4: Create constants**

Create `packages/shared/src/constants.ts`:
```typescript
export const CATEGORIES = [
  "Breaking",
  "Politics",
  "Economy",
  "Culture",
  "Media",
  "World",
  "Opinion",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const FEED_PAGE_SIZE = 20;
export const COMMENTS_PAGE_SIZE = 15;
export const FORUM_PAGE_SIZE = 25;
```

**Step 5: Create barrel export**

Create `packages/shared/src/index.ts`:
```typescript
export * from "./types";
export * from "./constants";
```

**Step 6: Reinstall and verify**

Run: `cd "J:/political news app" && npm install`

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add shared types and constants package"
```

---

## Phase 2: Supabase Setup & Database Schema

### Task 4: Configure Supabase Client for Next.js

**Files:**
- Create: `apps/web/lib/supabase/client.ts`
- Create: `apps/web/lib/supabase/server.ts`
- Create: `apps/web/lib/supabase/middleware.ts`
- Create: `apps/web/middleware.ts`
- Create: `apps/web/.env.local`

**Step 1: Create browser client**

Create `apps/web/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 2: Create server client**

Create `apps/web/lib/supabase/server.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from Server Component — ignore
          }
        },
      },
    }
  );
}
```

**Step 3: Create middleware helper**

Create `apps/web/lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}
```

**Step 4: Create Next.js middleware**

Create `apps/web/middleware.ts`:
```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Step 5: Create .env.local (user must fill in values from Supabase dashboard)**

Create `apps/web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
X_API_BEARER_TOKEN=your-x-api-token
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: configure Supabase client for Next.js SSR"
```

---

### Task 5: Create Database Migration (SQL)

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Write the full schema migration**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
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
```

**Step 2: Note for user — run this migration in Supabase dashboard SQL editor**

The user should:
1. Create a Supabase project at https://supabase.com/dashboard
2. Go to SQL Editor
3. Paste and run `001_initial_schema.sql`
4. Copy project URL and anon key to `apps/web/.env.local`

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add database schema with RLS policies"
```

---

## Phase 3: Authentication

### Task 6: Build Auth Pages

**Files:**
- Create: `apps/web/app/(auth)/login/page.tsx`
- Create: `apps/web/app/(auth)/signup/page.tsx`
- Create: `apps/web/app/(auth)/auth/callback/route.ts`
- Create: `apps/web/components/auth-form.tsx`

**Step 1: Create the auth form component**

Create `apps/web/components/auth-form.tsx`:
```tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, display_name: username },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push("/");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      {mode === "signup" && (
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500"
        />
      )}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
        className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500"
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg font-semibold transition-colors"
      >
        {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
      </button>
      <a
        href={mode === "login" ? "/signup" : "/login"}
        className="text-center text-sm text-gray-400 hover:text-gray-200"
      >
        {mode === "login"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </a>
    </form>
  );
}
```

**Step 2: Create login page**

Create `apps/web/app/(auth)/login/page.tsx`:
```tsx
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold mb-8">Sign In</h1>
      <AuthForm mode="login" />
    </main>
  );
}
```

**Step 3: Create signup page**

Create `apps/web/app/(auth)/signup/page.tsx`:
```tsx
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold mb-8">Create Account</h1>
      <AuthForm mode="signup" />
    </main>
  );
}
```

**Step 4: Create auth callback handler**

Create `apps/web/app/(auth)/auth/callback/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(origin);
}
```

**Step 5: Verify auth flow works (manual test)**

1. Run dev server: `npm run dev:web`
2. Navigate to `/signup` — form should render
3. Navigate to `/login` — form should render

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add auth pages with email/password login and signup"
```

---

## Phase 4: News Feed & X API Integration

### Task 7: Build X API Integration

**Files:**
- Create: `apps/web/lib/x-api.ts`
- Create: `apps/web/app/api/cron/fetch-posts/route.ts`

**Step 1: Create X API client**

Create `apps/web/lib/x-api.ts`:
```typescript
const X_API_BASE = "https://api.x.com/2";

interface XTweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  attachments?: {
    media_keys?: string[];
  };
}

interface XUser {
  id: string;
  name: string;
  username: string;
  profile_image_url: string;
}

interface XMedia {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
}

interface XTimelineResponse {
  data?: XTweet[];
  includes?: {
    users?: XUser[];
    media?: XMedia[];
  };
  meta?: {
    next_token?: string;
    result_count: number;
  };
}

function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}`,
  };
}

export async function getUserIdByUsername(
  username: string
): Promise<string | null> {
  const res = await fetch(`${X_API_BASE}/users/by/username/${username}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data?.id ?? null;
}

export async function getUserRecentTweets(
  userId: string,
  maxResults = 10
): Promise<XTimelineResponse> {
  const params = new URLSearchParams({
    max_results: String(maxResults),
    "tweet.fields": "created_at,attachments",
    expansions: "author_id,attachments.media_keys",
    "user.fields": "name,username,profile_image_url",
    "media.fields": "url,preview_image_url,type",
  });

  const res = await fetch(
    `${X_API_BASE}/users/${userId}/tweets?${params}`,
    { headers: getHeaders() }
  );

  if (!res.ok) {
    console.error("X API error:", res.status, await res.text());
    return {};
  }

  return res.json();
}
```

**Step 2: Create the cron fetch endpoint**

Create `apps/web/app/api/cron/fetch-posts/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserIdByUsername, getUserRecentTweets } from "@/lib/x-api";

// Use service role key for server-side operations
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  // Simple auth: check for a secret header (use cron service secret)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  // Get all active curated sources
  const { data: sources } = await supabase
    .from("curated_sources")
    .select("*")
    .eq("is_active", true);

  if (!sources || sources.length === 0) {
    return NextResponse.json({ message: "No active sources" });
  }

  let totalInserted = 0;

  for (const source of sources) {
    // Get X user ID
    const userId = await getUserIdByUsername(source.x_handle);
    if (!userId) continue;

    // Get recent tweets
    const timeline = await getUserRecentTweets(userId, 5);
    if (!timeline.data) continue;

    const userMap = new Map(
      timeline.includes?.users?.map((u) => [u.id, u]) ?? []
    );
    const mediaMap = new Map(
      timeline.includes?.media?.map((m) => [m.media_key, m]) ?? []
    );

    for (const tweet of timeline.data) {
      const author = userMap.get(tweet.author_id);
      const mediaKeys = tweet.attachments?.media_keys ?? [];
      const mediaUrls = mediaKeys
        .map((key) => {
          const m = mediaMap.get(key);
          return m?.url ?? m?.preview_image_url ?? null;
        })
        .filter(Boolean) as string[];

      // Upsert to avoid duplicates
      const { error } = await supabase.from("posts").upsert(
        {
          source: "x",
          x_tweet_id: tweet.id,
          x_author_handle: author?.username ?? source.x_handle,
          x_author_name: author?.name ?? source.display_name,
          x_author_avatar: author?.profile_image_url ?? null,
          content: tweet.text,
          media_urls: mediaUrls,
          category: source.category,
          created_at: tweet.created_at,
        },
        { onConflict: "x_tweet_id" }
      );

      if (!error) totalInserted++;
    }
  }

  return NextResponse.json({
    message: `Fetched posts from ${sources.length} sources`,
    inserted: totalInserted,
  });
}
```

**Step 3: Add CRON_SECRET to .env.example**

Append to `.env.example`:
```
CRON_SECRET=your-random-secret-for-cron
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add X API integration and cron fetch endpoint"
```

---

### Task 8: Build the Main News Feed UI

**Files:**
- Create: `apps/web/app/(main)/layout.tsx`
- Create: `apps/web/app/(main)/page.tsx`
- Create: `apps/web/components/nav-bar.tsx`
- Create: `apps/web/components/post-card.tsx`
- Create: `apps/web/components/category-tabs.tsx`
- Create: `apps/web/components/vote-button.tsx`

**Step 1: Create the nav bar**

Create `apps/web/components/nav-bar.tsx`:
```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function NavBar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
        <Link href="/" className="text-xl font-bold text-red-500 tracking-tight">
          The Right Wire
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/community" className="text-sm text-gray-400 hover:text-gray-100 transition-colors">
            Community
          </Link>
          <Link href="/forums" className="text-sm text-gray-400 hover:text-gray-100 transition-colors">
            Forums
          </Link>
          {user ? (
            <Link href="/profile" className="text-sm text-gray-400 hover:text-gray-100 transition-colors">
              Profile
            </Link>
          ) : (
            <Link href="/login" className="text-sm px-4 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
```

**Step 2: Create category tabs**

Create `apps/web/components/category-tabs.tsx`:
```tsx
"use client";

import { CATEGORIES } from "@repo/shared";
import { useRouter, useSearchParams } from "next/navigation";

export function CategoryTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category") ?? "all";

  function handleClick(category: string) {
    const params = new URLSearchParams(searchParams);
    if (category === "all") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => handleClick("all")}
        className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
          active === "all"
            ? "bg-red-600 text-white"
            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
        }`}
      >
        All
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => handleClick(cat)}
          className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
            active === cat
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
```

**Step 3: Create vote button**

Create `apps/web/components/vote-button.tsx`:
```tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function VoteButton({
  targetType,
  targetId,
  initialCount,
}: {
  targetType: "post" | "comment";
  targetId: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);
  const supabase = createClient();

  async function handleVote() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (voted) {
      await supabase
        .from("votes")
        .delete()
        .eq("user_id", user.id)
        .eq("target_type", targetType)
        .eq("target_id", targetId);
      setCount((c) => c - 1);
      setVoted(false);
    } else {
      await supabase.from("votes").upsert({
        user_id: user.id,
        target_type: targetType,
        target_id: targetId,
        value: 1,
      });
      setCount((c) => c + 1);
      setVoted(true);
    }
  }

  return (
    <button
      onClick={handleVote}
      className={`flex items-center gap-1 text-sm transition-colors ${
        voted ? "text-red-500" : "text-gray-500 hover:text-gray-300"
      }`}
    >
      <svg className="w-4 h-4" fill={voted ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
      {count}
    </button>
  );
}
```

**Step 4: Create post card**

Create `apps/web/components/post-card.tsx`:
```tsx
import type { Post } from "@repo/shared";
import { VoteButton } from "./vote-button";
import Link from "next/link";

export function PostCard({ post }: { post: Post }) {
  const timeAgo = getTimeAgo(new Date(post.created_at));

  return (
    <article className="border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start gap-3">
        {post.source === "x" && post.x_author_avatar && (
          <img
            src={post.x_author_avatar}
            alt=""
            className="w-10 h-10 rounded-full"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            {post.source === "x" ? (
              <>
                <span className="font-semibold">{post.x_author_name}</span>
                <span className="text-gray-500">@{post.x_author_handle}</span>
              </>
            ) : (
              <span className="font-semibold">Community Post</span>
            )}
            <span className="text-gray-600">·</span>
            <span className="text-gray-500">{timeAgo}</span>
            <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-400">
              {post.category}
            </span>
          </div>
          <p className="mt-2 text-gray-200 whitespace-pre-wrap">{post.content}</p>
          {post.media_urls.length > 0 && (
            <div className="mt-3 grid gap-2 grid-cols-2">
              {post.media_urls.slice(0, 4).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="rounded-lg w-full object-cover max-h-64"
                />
              ))}
            </div>
          )}
          <div className="flex items-center gap-6 mt-3">
            <VoteButton targetType="post" targetId={post.id} initialCount={post.upvote_count} />
            <Link
              href={`/post/${post.id}`}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {post.comment_count}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
```

**Step 5: Create main layout with nav**

Create `apps/web/app/(main)/layout.tsx`:
```tsx
import { NavBar } from "@/components/nav-bar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-6">{children}</div>
    </>
  );
}
```

**Step 6: Create the feed page**

Create `apps/web/app/(main)/page.tsx`:
```tsx
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
```

**Step 7: Move root page.tsx — delete `apps/web/app/page.tsx` (the placeholder)**

The new `(main)/page.tsx` replaces the root placeholder. Delete `apps/web/app/page.tsx`.

**Step 8: Verify dev server renders the feed page**

Run: `npm run dev:web`
Expected: Homepage shows nav bar, category tabs, and "No posts yet" message

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: build main news feed UI with post cards, voting, and category filtering"
```

---

### Task 9: Build Post Detail Page with Comments

**Files:**
- Create: `apps/web/app/(main)/post/[id]/page.tsx`
- Create: `apps/web/components/comment-section.tsx`
- Create: `apps/web/components/comment-card.tsx`
- Create: `apps/web/components/comment-form.tsx`

**Step 1: Create comment form**

Create `apps/web/components/comment-form.tsx`:
```tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CommentForm({
  postId,
  parentId = null,
}: {
  postId: string;
  parentId?: string | null;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("comments").insert({
      post_id: postId,
      user_id: user.id,
      parent_id: parentId,
      content: content.trim(),
    });

    setContent("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        placeholder="Add a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500"
      />
      <button
        type="submit"
        disabled={loading || !content.trim()}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors"
      >
        Post
      </button>
    </form>
  );
}
```

**Step 2: Create comment card**

Create `apps/web/components/comment-card.tsx`:
```tsx
import type { Comment } from "@repo/shared";
import { VoteButton } from "./vote-button";

export function CommentCard({ comment }: { comment: Comment }) {
  const timeAgo = getTimeAgo(new Date(comment.created_at));

  return (
    <div className="border-l-2 border-gray-800 pl-4 py-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold">
          {comment.user?.display_name ?? "Anonymous"}
        </span>
        <span className="text-gray-500">{timeAgo}</span>
      </div>
      <p className="mt-1 text-gray-300">{comment.content}</p>
      <div className="mt-2">
        <VoteButton
          targetType="comment"
          targetId={comment.id}
          initialCount={comment.upvote_count}
        />
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
```

**Step 3: Create comment section**

Create `apps/web/components/comment-section.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { CommentCard } from "./comment-card";
import { CommentForm } from "./comment-form";

export async function CommentSection({ postId }: { postId: string }) {
  const supabase = await createClient();

  const { data: comments } = await supabase
    .from("comments")
    .select("*, user:profiles(*)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">Comments</h3>
      <CommentForm postId={postId} />
      <div className="mt-4 flex flex-col gap-3">
        {comments && comments.length > 0 ? (
          comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))
        ) : (
          <p className="text-sm text-gray-500 py-4">
            No comments yet. Be the first to share your thoughts.
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Create post detail page**

Create `apps/web/app/(main)/post/[id]/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { PostCard } from "@/components/post-card";
import { CommentSection } from "@/components/comment-section";
import { notFound } from "next/navigation";

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

  return (
    <div>
      <PostCard post={post} />
      <CommentSection postId={post.id} />
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add post detail page with threaded comments"
```

---

## Phase 5: Community Social Feed

### Task 10: Build Social Feed (User Posts + Follow System)

**Files:**
- Create: `apps/web/app/(main)/community/page.tsx`
- Create: `apps/web/components/create-post-form.tsx`
- Create: `apps/web/components/user-post-card.tsx`
- Create: `apps/web/components/follow-button.tsx`

**Step 1: Create post creation form**

Create `apps/web/components/create-post-form.tsx`:
```tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreatePostForm() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    await supabase.from("user_posts").insert({
      user_id: user.id,
      content: content.trim(),
    });

    setContent("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="border border-gray-800 rounded-xl p-4">
      <textarea
        placeholder="What's on your mind?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="w-full bg-transparent text-gray-100 placeholder-gray-500 resize-none focus:outline-none"
      />
      <div className="flex justify-end mt-2">
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors"
        >
          Post
        </button>
      </div>
    </form>
  );
}
```

**Step 2: Create follow button**

Create `apps/web/components/follow-button.tsx`:
```tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function FollowButton({
  targetUserId,
  isFollowing: initialFollowing,
}: {
  targetUserId: string;
  isFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleClick() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    if (following) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);
      setFollowing(false);
    } else {
      await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: targetUserId,
      });
      setFollowing(true);
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
        following
          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
          : "bg-red-600 text-white hover:bg-red-700"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
```

**Step 3: Create user post card**

Create `apps/web/components/user-post-card.tsx`:
```tsx
import { VoteButton } from "./vote-button";

interface UserPostWithProfile {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  upvote_count: number;
  comment_count: number;
  created_at: string;
  user: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export function UserPostCard({ post }: { post: UserPostWithProfile }) {
  const timeAgo = getTimeAgo(new Date(post.created_at));

  return (
    <article className="border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">
          {post.user.display_name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{post.user.display_name}</span>
            <span className="text-gray-500">@{post.user.username}</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500">{timeAgo}</span>
          </div>
          <p className="mt-2 text-gray-200 whitespace-pre-wrap">{post.content}</p>
          <div className="flex items-center gap-6 mt-3">
            <VoteButton targetType="post" targetId={post.id} initialCount={post.upvote_count} />
          </div>
        </div>
      </div>
    </article>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
```

**Step 4: Create community feed page**

Create `apps/web/app/(main)/community/page.tsx`:
```tsx
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
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add community social feed with user posts and follow system"
```

---

## Phase 6: Forums

### Task 11: Build Forums UI

**Files:**
- Create: `apps/web/app/(main)/forums/page.tsx`
- Create: `apps/web/app/(main)/forums/[slug]/page.tsx`
- Create: `apps/web/app/(main)/forums/[slug]/new/page.tsx`
- Create: `apps/web/components/forum-card.tsx`
- Create: `apps/web/components/thread-card.tsx`
- Create: `apps/web/components/create-thread-form.tsx`

**Step 1: Create forum card**

Create `apps/web/components/forum-card.tsx`:
```tsx
import Link from "next/link";

interface ForumData {
  id: string;
  name: string;
  slug: string;
  description: string;
  post_count: number;
  member_count: number;
}

export function ForumCard({ forum }: { forum: ForumData }) {
  return (
    <Link
      href={`/forums/${forum.slug}`}
      className="block border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
    >
      <h3 className="text-lg font-semibold">{forum.name}</h3>
      <p className="mt-1 text-sm text-gray-400">{forum.description}</p>
      <div className="mt-3 flex gap-4 text-xs text-gray-500">
        <span>{forum.member_count} members</span>
        <span>{forum.post_count} threads</span>
      </div>
    </Link>
  );
}
```

**Step 2: Create thread card**

Create `apps/web/components/thread-card.tsx`:
```tsx
import Link from "next/link";
import { VoteButton } from "./vote-button";

interface ThreadData {
  id: string;
  forum_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  upvote_count: number;
  comment_count: number;
  created_at: string;
  user: {
    username: string;
    display_name: string;
  };
}

export function ThreadCard({
  thread,
  forumSlug,
}: {
  thread: ThreadData;
  forumSlug: string;
}) {
  const timeAgo = getTimeAgo(new Date(thread.created_at));

  return (
    <div className="border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
      {thread.is_pinned && (
        <span className="text-xs text-red-400 font-semibold mb-1 block">
          PINNED
        </span>
      )}
      <h3 className="font-semibold text-gray-100">{thread.title}</h3>
      <p className="mt-1 text-sm text-gray-400 line-clamp-2">{thread.content}</p>
      <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
        <span>by {thread.user?.display_name}</span>
        <span>{timeAgo}</span>
        <VoteButton targetType="post" targetId={thread.id} initialCount={thread.upvote_count} />
        <span>{thread.comment_count} replies</span>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
```

**Step 3: Create forums listing page**

Create `apps/web/app/(main)/forums/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { ForumCard } from "@/components/forum-card";

export default async function ForumsPage() {
  const supabase = await createClient();

  const { data: forums } = await supabase
    .from("forums")
    .select("*")
    .order("member_count", { ascending: false });

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Forums</h1>
      <div className="flex flex-col gap-3">
        {forums?.map((forum) => (
          <ForumCard key={forum.id} forum={forum} />
        ))}
      </div>
    </>
  );
}
```

**Step 4: Create create-thread form**

Create `apps/web/components/create-thread-form.tsx`:
```tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateThreadForm({ forumId, forumSlug }: { forumId: string; forumSlug: string }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    await supabase.from("forum_threads").insert({
      forum_id: forumId,
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
    });

    router.push(`/forums/${forumSlug}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="Thread title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500"
      />
      <textarea
        placeholder="What do you want to discuss?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        rows={6}
        className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:border-red-500"
      />
      <button
        type="submit"
        disabled={loading}
        className="self-end px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg font-semibold transition-colors"
      >
        Create Thread
      </button>
    </form>
  );
}
```

**Step 5: Create forum detail page (thread listing)**

Create `apps/web/app/(main)/forums/[slug]/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { ThreadCard } from "@/components/thread-card";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ForumDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: forum } = await supabase
    .from("forums")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!forum) notFound();

  const { data: threads } = await supabase
    .from("forum_threads")
    .select("*, user:profiles(*)")
    .eq("forum_id", forum.id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{forum.name}</h1>
          <p className="text-sm text-gray-400 mt-1">{forum.description}</p>
        </div>
        <Link
          href={`/forums/${slug}/new`}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold transition-colors"
        >
          New Thread
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {threads && threads.length > 0 ? (
          threads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} forumSlug={slug} />
          ))
        ) : (
          <p className="text-center py-16 text-gray-500">
            No threads yet. Start the conversation!
          </p>
        )}
      </div>
    </>
  );
}
```

**Step 6: Create new thread page**

Create `apps/web/app/(main)/forums/[slug]/new/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { CreateThreadForm } from "@/components/create-thread-form";
import { notFound } from "next/navigation";

export default async function NewThreadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: forum } = await supabase
    .from("forums")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!forum) notFound();

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">
        New Thread in {forum.name}
      </h1>
      <CreateThreadForm forumId={forum.id} forumSlug={forum.slug} />
    </>
  );
}
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add forums with thread listing and creation"
```

---

## Phase 7: Admin Panel for Curated Sources

### Task 12: Build Admin Page for Managing X Sources

**Files:**
- Create: `apps/web/app/(main)/admin/page.tsx`
- Create: `apps/web/components/add-source-form.tsx`
- Create: `apps/web/components/source-list.tsx`

**Step 1: Create add source form**

Create `apps/web/components/add-source-form.tsx`:
```tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@repo/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddSourceForm() {
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [category, setCategory] = useState("Politics");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await supabase.from("curated_sources").insert({
      x_handle: handle.replace("@", ""),
      display_name: displayName,
      category,
    });

    setHandle("");
    setDisplayName("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Add X Source</h2>
      <input
        type="text"
        placeholder="@handle (e.g. LibHivemind)"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        required
        className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500"
      />
      <input
        type="text"
        placeholder="Display name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
        className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-red-500"
      >
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg font-semibold transition-colors"
      >
        Add Source
      </button>
    </form>
  );
}
```

**Step 2: Create source list**

Create `apps/web/components/source-list.tsx`:
```tsx
interface Source {
  id: string;
  x_handle: string;
  display_name: string;
  category: string;
  is_active: boolean;
}

export function SourceList({ sources }: { sources: Source[] }) {
  return (
    <div className="flex flex-col gap-2">
      {sources.map((source) => (
        <div
          key={source.id}
          className="flex items-center justify-between border border-gray-800 rounded-lg p-3"
        >
          <div>
            <span className="font-semibold">@{source.x_handle}</span>
            <span className="ml-2 text-sm text-gray-400">
              {source.display_name}
            </span>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-400">
              {source.category}
            </span>
          </div>
          <span
            className={`text-xs font-semibold ${
              source.is_active ? "text-green-400" : "text-gray-500"
            }`}
          >
            {source.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      ))}
    </div>
  );
}
```

**Step 3: Create admin page**

Create `apps/web/app/(main)/admin/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { AddSourceForm } from "@/components/add-source-form";
import { SourceList } from "@/components/source-list";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: sources } = await supabase
    .from("curated_sources")
    .select("*")
    .order("added_at", { ascending: false });

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Manage Sources</h1>
      <AddSourceForm />
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3">
          Current Sources ({sources?.length ?? 0})
        </h2>
        {sources && sources.length > 0 ? (
          <SourceList sources={sources} />
        ) : (
          <p className="text-gray-500">
            No sources configured yet. Add X handles above.
          </p>
        )}
      </div>
    </>
  );
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add admin panel for managing curated X sources"
```

---

## Phase 8: YouTube Content Curation Tool

### Task 13: Build Daily Highlights Dashboard

This task creates a simple internal tool to help curate content for YouTube videos.

**Files:**
- Create: `apps/web/app/(main)/highlights/page.tsx`
- Create: `apps/web/components/highlight-picker.tsx`

**Step 1: Create highlight picker component**

Create `apps/web/components/highlight-picker.tsx`:
```tsx
"use client";

import { useState } from "react";

interface HighlightPost {
  id: string;
  content: string;
  x_author_handle: string | null;
  x_author_name: string | null;
  category: string;
  upvote_count: number;
  created_at: string;
}

export function HighlightPicker({ posts }: { posts: HighlightPost[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportScript() {
    const selectedPosts = posts.filter((p) => selected.has(p.id));
    const script = selectedPosts
      .map(
        (p, i) =>
          `--- Story ${i + 1} ---\nSource: @${p.x_author_handle}\nCategory: ${p.category}\n\n${p.content}\n`
      )
      .join("\n");

    // Copy to clipboard
    navigator.clipboard.writeText(script);
    alert(`Copied ${selectedPosts.length} stories to clipboard!`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">
          {selected.size} stories selected
        </p>
        <button
          onClick={exportScript}
          disabled={selected.size === 0}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors"
        >
          Copy as Script
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {posts.map((post) => (
          <button
            key={post.id}
            onClick={() => toggleSelect(post.id)}
            className={`text-left border rounded-xl p-4 transition-colors ${
              selected.has(post.id)
                ? "border-red-500 bg-red-500/10"
                : "border-gray-800 hover:border-gray-700"
            }`}
          >
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>@{post.x_author_handle}</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-800">
                {post.category}
              </span>
              <span className="ml-auto">{post.upvote_count} upvotes</span>
            </div>
            <p className="mt-2 text-gray-200 line-clamp-3">{post.content}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Create highlights page**

Create `apps/web/app/(main)/highlights/page.tsx`:
```tsx
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
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add daily highlights picker for YouTube content curation"
```

---

## Phase 9: Polish & Deploy Prep

### Task 14: Add Profile Page

**Files:**
- Create: `apps/web/app/(main)/profile/page.tsx`

**Step 1: Create profile page**

Create `apps/web/app/(main)/profile/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: postCount } = await supabase
    .from("user_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <div>
      <div className="border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold">
            {profile?.display_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile?.display_name}</h1>
            <p className="text-gray-400">@{profile?.username}</p>
          </div>
        </div>
        {profile?.bio && (
          <p className="mt-4 text-gray-300">{profile.bio}</p>
        )}
        <div className="mt-4 flex gap-6 text-sm text-gray-400">
          <span>Joined {new Date(profile?.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      <form action="/api/auth/signout" method="post" className="mt-4">
        <button className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          Sign Out
        </button>
      </form>
    </div>
  );
}
```

**Step 2: Create sign out API route**

Create `apps/web/app/api/auth/signout/route.ts`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000"));
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add user profile page with sign out"
```

---

### Task 15: Final Wiring and Verification

**Step 1: Verify all routes work**

Run: `npm run dev:web`

Check each route manually:
- `/` — Feed page with category tabs
- `/login` — Login form
- `/signup` — Signup form
- `/community` — Social feed
- `/forums` — Forums listing
- `/admin` — Source management
- `/highlights` — YouTube curation tool
- `/profile` — Profile (redirects to login if not authed)

**Step 2: Run build to catch type errors**

Run: `cd "J:/political news app/apps/web" && npx next build`
Expected: Build succeeds with no type errors

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: verify build and all routes"
```

---

## Setup Checklist (for the user)

After implementing all tasks, the user needs to:

1. **Create a Supabase project** at https://supabase.com/dashboard
2. **Run the SQL migration** (`supabase/migrations/001_initial_schema.sql`) in the SQL Editor
3. **Copy credentials** to `apps/web/.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. **Apply for X API access** at https://developer.x.com (Basic tier at $200/mo recommended)
5. **Add X API bearer token** to `.env.local`
6. **Add curated sources** via the `/admin` page
7. **Set up a cron job** (e.g., Vercel Cron or external service) to hit `/api/cron/fetch-posts` periodically
8. **Deploy** to Vercel: `npx vercel`

---

## Future Enhancements (not in this plan)

- Expo React Native mobile app (Phase 2 project)
- Push notifications for breaking news
- Real-time comments via Supabase Realtime
- Image/media upload for community posts
- Moderation tools
- Trending topics sidebar
- Bookmarking/saving posts
- Dark/light theme toggle
