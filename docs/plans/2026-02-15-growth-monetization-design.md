# The Right Wire — Growth & Monetization Design

**Date:** 2026-02-15
**Status:** Approved
**Author:** Wire (AI) + Suhteevah

---

## Context

The Right Wire is a political news aggregator targeting conservative news junkies. It aggregates 32+ Twitter/X accounts, RSS feeds, and YouTube channels into a single feed with community features (forums, comments, voting, following). Currently deployed at the-right-wire.com with zero monetization, zero analytics, and a small early-adopter user base.

**Decisions made:**
- Grow user base and monetize simultaneously
- No ads, ever
- Revenue from subscriptions, premium features, and donations
- Multi-channel growth: SEO, social/viral, influencer partnerships

---

## Revenue Architecture

### Free Tier — "The Wire"

Everything that exists today:
- Full news feed from all curated sources
- Community posts, forums, comments, voting
- Embed link buttons (FxTwitter/VxTwitter/FixupX)
- User profiles, following

### Premium Tier — "Wire Pro" ($6.99/month or $59.99/year)

- **Breaking Alerts** — Real-time push notifications for major stories, configurable by category
- **Custom Feed Curation** — Choose which sources appear in personal feed, pin favorites, mute sources
- **Daily Digest Email** — Morning briefing with top stories by upvotes, sent at 7am EST
- **Wire Pro Badge** — Gold wire icon on profile and comments
- **Priority Support** — Direct line for feature requests

### Power Tier — "Wire Intelligence" ($19.99/month)

Everything in Wire Pro, plus:
- **Intelligence Brief** — Automated daily/weekly PDF reports formatted for content creators
- **Highlight Export** — Enhanced highlights with one-click export to scripts, show notes, social thread drafts
- **Topic Alerts** — Keyword monitoring across all sources with notifications
- **Data API Access** — REST API to query curated posts programmatically (rate-limited)
- **Trend Dashboard** — Visual analytics showing trending topics and volume over time

### Donation Supplement

- "Support The Wire" button on site
- One-time tips via Stripe ($5, $10, $25, custom)
- Supporter badge on profile

---

## User Growth Engine

### Channel 1: SEO & Discoverability

- Dynamic `generateMetadata()` on `/post/[id]` pages with title, description, OG/Twitter Card tags
- Dynamic sitemap generation at `/sitemap.xml`
- JSON-LD structured data (NewsArticle schema) on post pages
- Each post becomes a landing page for organic search traffic

### Channel 2: Social & Viral Sharing

- **Shareable branded cards** — Generate image cards with Right Wire branding for sharing to X/Discord/Telegram
- **Free email newsletter** — Weekly "Wire Report" with top 10 stories by upvotes (top-of-funnel growth tool)
- **Discord bot** — Posts breaking stories to public Discord server, drives traffic to site
- **Referral system** — "Invite a patriot" unique referral links; 3 referrals = 1 month Wire Pro free

### Channel 3: Influencer & Creator Partnerships

- **Creator referral commission** — 20% recurring commission on referred Wire Intelligence subscriptions (Stripe affiliate)
- **"Powered by The Right Wire" watermark** — On exported Intelligence Briefs and highlight scripts
- **Source partnerships** — Official badges and profile links for curated accounts

### Channel 4: Analytics & Optimization

- **Plausible Analytics** — Privacy-friendly, no cookies, tracks page views and referrers
- **Internal engagement metrics** — Admin dashboard for signups, DAU, votes/day, conversion rates
- **A/B test paywall boundary** — Start generous, tighten based on engagement data

---

## Technical Architecture

### Stripe Integration

- **Stripe Checkout** for payment flow (hosted by Stripe, no CC handling on our side)
- **Stripe Customer Portal** for subscription management (cancel, upgrade, update payment)
- **Stripe Webhooks** at `/api/webhooks/stripe` to sync subscription status to Supabase
- New DB tables: `customers`, `subscriptions`
- RLS: users can only read their own subscription data

### Subscription Gating

- Server-side check via `getUserPlan(userId)` returning `"free" | "pro" | "intelligence"`
- Check at component/API level (no middleware gating needed)
- Query `subscriptions` table for active plan status

### Email System

- Gmail SMTP (existing setup) for transactional emails
- New `email_preferences` table
- Cron `/api/cron/daily-digest` at 7am EST for Pro+ users
- Cron for weekly free newsletter

### SEO Enhancements

- `generateMetadata()` on post detail pages
- `/sitemap.xml` dynamic route
- JSON-LD NewsArticle structured data
- OpenGraph + Twitter Card meta tags

### Wire Intelligence Features

- `/api/intelligence/brief` — PDF report generation
- `/api/intelligence/alerts` — Keyword alert checking during cron scrape runs
- `/dashboard` page — Trending topic charts (Recharts)
- `/api/v1/posts` — Rate-limited API with API key auth

### New Database Tables

```sql
-- Stripe customer mapping
customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  stripe_customer_id text not null unique,
  created_at timestamptz default now()
)

-- Subscription tracking
subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  stripe_subscription_id text not null unique,
  plan text not null check (plan in ('pro', 'intelligence')),
  status text not null check (status in ('active', 'canceled', 'past_due', 'trialing')),
  current_period_end timestamptz not null,
  created_at timestamptz default now()
)

-- Email preferences
email_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  daily_digest boolean default false,
  weekly_newsletter boolean default true,
  breaking_alerts boolean default false,
  created_at timestamptz default now()
)

-- Keyword alerts (Intelligence tier)
keyword_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  keywords text[] not null,
  is_active boolean default true,
  last_triggered_at timestamptz,
  created_at timestamptz default now()
)

-- Referral tracking
referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references auth.users not null,
  referred_id uuid references auth.users not null unique,
  status text default 'pending' check (status in ('pending', 'completed', 'rewarded')),
  created_at timestamptz default now()
)

-- Internal analytics events
analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users,
  metadata jsonb default '{}',
  created_at timestamptz default now()
)
```

---

## Landing Pages (Required for Stripe Verification)

1. **Pricing Page (`/pricing`)** — Three-tier comparison with feature lists and CTA buttons
2. **About Page (`/about`)** — Mission, who runs it, credibility
3. **Terms of Service (`/terms`)** — Account, billing, auto-renewal, cancellation, content, conduct
4. **Privacy Policy (`/privacy`)** — Data collection, usage, cookies (minimal), retention, CCPA/GDPR
5. **Refund Policy (`/refunds`)** — Cancellation terms, 7-day refund for annual plans
6. **Contact Page (`/contact`)** — Contact email, support form

All static pages, public, dark theme matching existing site.

---

## Implementation Phases

### Phase 1: Stripe + Subscriptions + Landing Pages (Unlocks Revenue)
- Stripe account setup and product/pricing configuration
- `customers` and `subscriptions` tables with RLS
- Webhook handler at `/api/webhooks/stripe`
- `getUserPlan()` helper function
- Pricing page, About, Terms, Privacy, Refund, Contact pages
- Checkout flow and Customer Portal integration
- Subscription gating on Pro/Intelligence features

### Phase 2: SEO + Email Newsletter Signup (Unlocks Growth)
- `generateMetadata()` on post detail pages
- Dynamic sitemap at `/sitemap.xml`
- JSON-LD structured data
- Email newsletter signup form (free tier)
- `email_preferences` table

### Phase 3: Daily Digest + Breaking Alerts (Adds Pro Value)
- Cron endpoint `/api/cron/daily-digest`
- Email template for daily digest
- Breaking alert system (category-based notifications)
- Custom feed curation UI

### Phase 4: Wire Intelligence (Adds Intelligence Value)
- Intelligence Brief PDF generation
- Enhanced highlight export (scripts, show notes, thread drafts)
- Keyword alert system with `keyword_alerts` table
- Trend dashboard with charts
- Rate-limited data API at `/api/v1/posts`

### Phase 5: Referral System + Analytics (Compounds Growth)
- Referral link generation and tracking
- Referral reward automation (1 month Pro after 3 referrals)
- Creator affiliate commission system
- Plausible Analytics integration
- Internal analytics dashboard for admin
- Shareable branded image cards

---

## Success Metrics

- **Month 1:** Stripe live, landing pages up, first paying subscribers
- **Month 3:** 100+ registered users, 10+ paid subscribers, newsletter list growing
- **Month 6:** 500+ registered users, 50+ paid subscribers, $300+/month MRR
- **Month 12:** 2,000+ registered users, 200+ paid subscribers, $1,400+/month MRR
