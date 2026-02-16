-- ============================================
-- CUSTOMERS (Stripe customer mapping)
-- ============================================
create table public.customers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  stripe_customer_id text not null unique,
  created_at timestamptz default now() not null
);

create index idx_customers_user_id on public.customers(user_id);
create index idx_customers_stripe_id on public.customers(stripe_customer_id);

alter table public.customers enable row level security;

create policy "Users can view own customer record"
  on public.customers for select using (auth.uid() = user_id);

-- ============================================
-- SUBSCRIPTIONS (Stripe subscription tracking)
-- ============================================
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text not null unique,
  plan text not null check (plan in ('pro', 'intelligence')),
  status text not null check (status in ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  current_period_end timestamptz not null,
  cancel_at_period_end boolean default false not null,
  created_at timestamptz default now() not null
);

create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_status on public.subscriptions(status);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select using (auth.uid() = user_id);

-- Service role can manage all subscriptions (for webhook handler)
-- No INSERT/UPDATE/DELETE policies for anon — only service role writes

-- ============================================
-- EMAIL PREFERENCES
-- ============================================
create table public.email_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  daily_digest boolean default false not null,
  weekly_newsletter boolean default true not null,
  breaking_alerts boolean default false not null,
  created_at timestamptz default now() not null
);

alter table public.email_preferences enable row level security;

create policy "Users can view own email preferences"
  on public.email_preferences for select using (auth.uid() = user_id);

create policy "Users can update own email preferences"
  on public.email_preferences for update using (auth.uid() = user_id);

create policy "Users can insert own email preferences"
  on public.email_preferences for insert with check (auth.uid() = user_id);

-- ============================================
-- KEYWORD ALERTS (Wire Intelligence tier)
-- ============================================
create table public.keyword_alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keywords text[] not null,
  is_active boolean default true not null,
  last_triggered_at timestamptz,
  created_at timestamptz default now() not null
);

create index idx_keyword_alerts_user_id on public.keyword_alerts(user_id);

alter table public.keyword_alerts enable row level security;

create policy "Users can view own keyword alerts"
  on public.keyword_alerts for select using (auth.uid() = user_id);

create policy "Users can create own keyword alerts"
  on public.keyword_alerts for insert with check (auth.uid() = user_id);

create policy "Users can update own keyword alerts"
  on public.keyword_alerts for update using (auth.uid() = user_id);

create policy "Users can delete own keyword alerts"
  on public.keyword_alerts for delete using (auth.uid() = user_id);

-- ============================================
-- REFERRALS
-- ============================================
create table public.referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null references auth.users(id) on delete cascade unique,
  status text default 'pending' not null check (status in ('pending', 'completed', 'rewarded')),
  created_at timestamptz default now() not null
);

create index idx_referrals_referrer on public.referrals(referrer_id);

alter table public.referrals enable row level security;

create policy "Users can view own referrals"
  on public.referrals for select using (auth.uid() = referrer_id or auth.uid() = referred_id);

-- ============================================
-- ANALYTICS EVENTS (internal tracking)
-- ============================================
create table public.analytics_events (
  id uuid primary key default uuid_generate_v4(),
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  metadata jsonb default '{}' not null,
  created_at timestamptz default now() not null
);

create index idx_analytics_events_type on public.analytics_events(event_type);
create index idx_analytics_events_created on public.analytics_events(created_at desc);

alter table public.analytics_events enable row level security;

-- Only service role can read/write analytics (no user access)
-- Admin dashboard will use service role key
