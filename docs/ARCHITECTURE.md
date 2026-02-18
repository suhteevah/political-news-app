# The Right Wire — Architecture

> System architecture, data flow, and key technical decisions.
> Last updated: 2026-02-17

---

## High-Level Overview

The Right Wire is a Next.js 15 monorepo deployed on Vercel. It aggregates content from 32+ Twitter/X accounts, RSS feeds, and YouTube channels into a unified feed with community features. Revenue comes from Stripe subscriptions (no ads).

```
┌─────────────────────────────────────────────────────────────────┐
│                        USERS (Web + Mobile)                      │
│                                                                   │
│  Web App (Next.js)          Mobile Apps (REST API /api/v1/*)     │
│  - Server Components        - Android (planned)                   │
│  - Client Components        - iOS (planned)                       │
└─────────┬──────────────────────────────┬────────────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APP ROUTER                           │
│                                                                   │
│  Pages (20)              API Routes (36)                          │
│  - Feed, Forums          - Auth, Posts, Comments, Votes           │
│  - Community, Admin      - Cron (scraping, digest, newsletter)    │
│  - Dashboard, Settings   - Webhooks (Stripe)                      │
│  - Legal, Auth           - Mobile v1 (26 endpoints)               │
└─────────┬──────────┬──────────┬──────────┬─────────────────────┘
          │          │          │          │
          ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Supabase │ │  Stripe  │ │  Gmail   │ │  GitHub  │
│          │ │          │ │  SMTP    │ │  Actions │
│ Postgres │ │ Checkout │ │          │ │          │
│ Auth     │ │ Portal   │ │ Digest   │ │ Scraping │
│ RLS      │ │ Webhooks │ │ Alerts   │ │ Cron     │
│ Triggers │ │          │ │ News-    │ │          │
│          │ │          │ │ letter   │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

---

## Module Map

```
J:\political news app/
├── apps/web/                    Main Next.js application
│   ├── app/                     App Router pages & API routes
│   │   ├── (auth)/              Auth pages (login, signup)
│   │   ├── (main)/              Main layout group (feed, forums, etc.)
│   │   └── api/                 API endpoints
│   │       ├── admin/           Admin-only endpoints
│   │       ├── cron/            Cron job endpoints (scraping, digest, etc.)
│   │       ├── v1/              Mobile REST API (26 endpoints)
│   │       └── webhooks/        Stripe webhook handler
│   ├── components/              React components
│   ├── lib/                     Shared utilities
│   │   ├── supabase/            Supabase client factories
│   │   ├── stripe.ts            Stripe client (lazy proxy pattern)
│   │   ├── email.ts             Nodemailer transport + HTML builders
│   │   ├── scraper.ts           Twitter/X scraper (multi-strategy)
│   │   ├── rss-scraper.ts       RSS/YouTube feed scraper
│   │   ├── get-user-plan.ts     Plan resolution (Stripe → referral → free)
│   │   ├── intelligence-brief.tsx  PDF generation for Intelligence tier
│   │   └── analytics.ts         Analytics event tracking
│   └── middleware.ts            Session refresh + referral cookie
├── packages/shared/             Shared constants (@repo/shared)
├── supabase/migrations/         Database migrations (001-005)
├── .github/workflows/           GitHub Actions cron jobs
├── docs/                        Project documentation
└── scripts/                     Utility scripts (bulk import, testing)
```

---

## Data Flow

### Content Ingestion

```
GitHub Actions (every 2 hours)
       │
       ▼
GET /api/cron/fetch-posts (auth: CRON_SECRET)
       │
       ├─── Phase 1: Twitter/X Scraping ──────────────────┐
       │    scraper.ts                                      │
       │    Layer 1: Twitter Syndication API (primary)      │
       │    Layer 2: FxTwitter API (fallback)               │
       │    Layer 3: SearXNG (optional discovery)           │
       │    Dedup on: x_tweet_id                            │
       │    Delay: 2 seconds between sources                │
       │                                                    │
       ├─── Phase 2: RSS/YouTube Scraping ─────────────────┤
       │    rss-scraper.ts                                  │
       │    Buzzsprout, YouTube Atom, generic RSS 2.0       │
       │    Dedup on: source_id                             │
       │    Delay: 1 second between feeds                   │
       │                                                    ▼
       └──────────────────────────────────────► posts table (upsert)
```

### User-Generated Content

```
User action → Supabase client (anon key + RLS) → Database
                                                      │
                                                      ▼
                                              Database Triggers
                                              ├── Vote → Update upvote_count
                                              └── Comment → Update comment_count
```

### Stripe Subscription Flow

```
User clicks "Subscribe" on /pricing
       │
       ▼
POST /api/checkout { plan, billingPeriod }
       │
       ├── Server resolves Stripe Price ID from env vars
       ├── Looks up/creates Stripe Customer
       └── Creates Stripe Checkout Session
              │
              ▼
       Stripe Hosted Checkout Page
              │
              ▼ (on success)
       Stripe fires webhook
              │
              ▼
POST /api/webhooks/stripe
       │
       ├── checkout.session.completed → Upsert customers + subscriptions
       ├── customer.subscription.updated → Update subscription
       ├── customer.subscription.deleted → Mark canceled
       └── invoice.payment_failed → Mark past_due
```

### Plan Resolution

```
getUserPlan(userId)
       │
       ├── 1. Check subscriptions table
       │      Active/trialing with valid current_period_end?
       │      → Return "pro" or "intelligence"
       │
       ├── 2. Check profiles.referral_pro_until
       │      Unexpired referral Pro time?
       │      → Return "pro"
       │
       └── 3. Default → "free"
```

### Email Delivery

```
Cron trigger (GitHub Actions)
       │
       ├── Daily Digest (7am EST) → Pro/Intelligence subscribers
       ├── Weekly Newsletter (Mon 8am EST) → newsletter_subscribers
       ├── Intelligence Brief (6am EST) → Intelligence subscribers (PDF attachment)
       └── Breaking Alert (admin-triggered) → Pro+ subscribers
              │
              ▼
       Nodemailer → Gmail SMTP (smtp.gmail.com:587)
       Rate limit: 500ms between emails
       From: "The Right Wire" <suhteevah@gmail.com>
```

---

## Supabase Client Architecture

Three client factories for different contexts:

| Client | File | Auth | Use Case |
|--------|------|------|----------|
| Browser | `lib/supabase/client.ts` | Anon key, browser cookies | Client components |
| Server | `lib/supabase/server.ts` | Anon key, `next/headers` cookies | Server components, API routes |
| Admin | Created inline | Service role key, empty cookie stubs | Webhooks, cron jobs, referral tracking |

**Why three clients?**
- Browser client runs in the browser and manages cookies automatically
- Server client reads cookies from the request to identify the user server-side
- Admin client bypasses RLS for automated operations where there's no user session

---

## Key Architecture Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-15 | Stripe Lazy Proxy | ES Proxy in `stripe.ts` avoids build crash when env vars not set |
| 2026-02-15 | Server-side price resolution | Client sends plan name, not price ID — prevents injection |
| 2026-02-15 | Referral reward stacking | Days add on top of existing expiry, not from "now" |
| 2026-02-15 | Referral cookie in middleware | httpOnly, 30-day TTL, read/cleared after signup |
| 2026-02-16 | GitHub Actions for cron | Not Vercel cron — allows workflow_dispatch for manual triggers |
| 2026-02-17 | Mobile API under /api/v1/ | Versioned namespace for mobile clients, separate from web routes |
| 2026-02-17 | Haiku for WIRE comments | $0.18/day for full AI personality — absurdly cost-effective |
| 2026-02-17 | Sonnet for facts mode | Accuracy matters more than cost for factual Q&A |
| 2026-02-17 | wire_config table | Runtime config avoids redeployment for WIRE tuning |

---

## Database Schema Overview

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `profiles` | User profiles (extends auth.users) | username, display_name, avatar_url, bio, referral_code, referral_pro_until, is_bot (planned) |
| `posts` | All aggregated content | source (x/user/rss/youtube/wire), content, category, is_breaking, upvote_count, comment_count |
| `comments` | Threaded comments | post_id, user_id, parent_id, content, upvote_count |
| `votes` | Polymorphic votes | target_type (post/comment), target_id, value (+1/-1) |
| `forums` | 6 pre-seeded forums | name, slug, description |
| `forum_threads` | Discussion threads | forum_id, title, content, is_pinned |
| `forum_memberships` | Forum subscriptions | forum_id, user_id |
| `follows` | User-to-user following | follower_id, following_id |
| `user_posts` | Community posts | user_id, content |
| `curated_sources` | Twitter handles to scrape | x_handle, display_name, category, is_active |

### Monetization Tables

| Table | Purpose | Access |
|-------|---------|--------|
| `customers` | Stripe customer mapping | Owner read, service role write |
| `subscriptions` | Subscription tracking | Owner read, service role write |
| `email_preferences` | Per-user notification settings | Owner read/write |
| `keyword_alerts` | Intelligence keyword monitors | Owner CRUD |
| `referrals` | Referral tracking | Owner read |
| `analytics_events` | Internal event tracking | Service role only |
| `newsletter_subscribers` | Free newsletter emails | Service role only |

### Planned Tables (WIRE AI)

| Table | Purpose |
|-------|---------|
| `wire_interactions` | Ask WIRE usage tracking + rate limiting |
| `wire_columns` | Weekly column drafts for admin review |
| `wire_config` | Runtime configuration for WIRE behavior |

### Database Triggers

1. **`handle_new_user`** — After `auth.users` INSERT → Creates profile + referral code
2. **`on_vote_change`** — After votes change → Recalculates post `upvote_count`
3. **`on_comment_vote_change`** — After votes change → Recalculates comment `upvote_count`
4. **`on_comment_change`** — After comments change → Updates post `comment_count`

---

## External Dependencies

| Service | Purpose | Cost |
|---------|---------|------|
| Vercel | Hosting, serverless functions | Free tier (currently) |
| Supabase | Postgres database, auth, RLS | Free tier (currently) |
| Stripe | Payment processing | 2.9% + $0.30 per transaction |
| Gmail SMTP | Email delivery | Free (500/day limit) |
| GitHub Actions | Cron job execution | Free (2000 min/month) |
| Anthropic (planned) | Claude API for WIRE AI | ~$5.42/month at Level 2 |

---

## Security Model

- **RLS everywhere** — Every table has Row Level Security policies
- **Server-side price resolution** — Stripe Price IDs never sent from client
- **Cron authentication** — All cron endpoints check `Authorization: Bearer <CRON_SECRET>`
- **Admin hardcoded UUID** — Admin pages check against owner's UUID
- **Service role isolation** — Only used in webhooks, cron, and referral tracking
- **Cookie-based auth** — Supabase session stored in httpOnly cookies via middleware
