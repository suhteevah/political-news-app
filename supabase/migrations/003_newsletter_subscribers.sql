-- ============================================
-- NEWSLETTER SUBSCRIBERS (anonymous email capture)
-- For visitors who haven't signed up yet
-- ============================================
create table public.newsletter_subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  is_active boolean default true not null,
  source text default 'website' not null,
  created_at timestamptz default now() not null,
  unsubscribed_at timestamptz
);

create index idx_newsletter_email on public.newsletter_subscribers(email);
create index idx_newsletter_active on public.newsletter_subscribers(is_active) where is_active = true;

alter table public.newsletter_subscribers enable row level security;

-- No public access — only service role can read/write
-- Newsletter sending cron will use service role
