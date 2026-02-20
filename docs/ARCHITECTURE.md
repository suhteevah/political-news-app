# The Right Wire — Architecture

> System architecture, data flow, and key technical decisions.
> Last updated: 2026-02-20

---

## High-Level Overview

The Right Wire is a Next.js 15 monorepo deployed on Vercel. It aggregates content from 32+ Twitter/X accounts, RSS feeds, and YouTube channels into a unified feed with community features. Revenue comes from Stripe subscriptions and in-app purchases (no ads).

```
┌─────────────────────────────────────────────────────────────────┐
│                        USERS (Web + Mobile)                      │
│                                                                   │
│  Web App (Next.js)          Mobile Apps (REST API /api/v1/*)     │
│  - Server Components        - Android                             │
│  - Client Components        - iOS                                 │
│  - Cookie-based auth        - Bearer token auth                   │
└─────────┬──────────────────────────────┬────────────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APP ROUTER                           │
│                                                                   │
│  Pages (20)              API Routes (70+)                         │
│  - Feed, Forums          - Auth, Posts, Comments, Votes           │
│  - Community, Admin      - Cron (scraping, digest, newsletter)    │
│  - Dashboard, Settings   - Webhooks (Stripe)                      │
│  - Legal, Auth           - Mobile v1 (53 route files)             │
│                          - WIRE AI (briefings, hot takes, column) │
└─────────┬──────────┬──────────┬──────────┬─────────────────────┘
          │          │          │          │
          ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Supabase │ │  Stripe  │ │  Gmail   │ │  GitHub  │ │Anthropic │
│          │ │          │ │  SMTP    │ │  Actions │ │  Claude  │
│ Postgres │ │ Checkout │ │          │ │          │ │          │
│ Auth     │ │ Portal   │ │ Digest   │ │ Scraping │ │ Haiku    │
│ RLS      │ │ Webhooks │ │ Alerts   │ │ Cron     │ │ Sonnet   │
│ Storage  │ │ IAP      │ │ News-    │ │ WIRE AI  │ │ WIRE AI  │
│ Triggers │ │          │ │ letter   │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
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
│   │       ├── cron/            Cron job endpoints (scraping, digest, WIRE AI, etc.)
│   │       ├── v1/              Mobile REST API (53 route files, 12 domains)
│   │       │   ├── auth/        login, signup, refresh, forgot/reset/change-password, delete-account
│   │       │   ├── posts/       feed, detail, categories
│   │       │   ├── comments/    create, delete
│   │       │   ├── votes/       cast, remove, batch check
│   │       │   ├── forums/      list, detail, threads, thread delete, membership
│   │       │   ├── user-posts/  community posts
│   │       │   ├── users/       profile (me, public, followers, following)
│   │       │   ├── follows/     follow/unfollow
│   │       │   ├── bookmarks/   CRUD, batch check
│   │       │   ├── notifications/ inbox, mark read, delete, preferences
│   │       │   ├── devices/     push token registration
│   │       │   ├── iap/         validate, restore (Apple/Google)
│   │       │   ├── checkout/    Stripe Checkout (mobile deep links)
│   │       │   ├── portal/      Stripe Customer Portal
│   │       │   ├── donate/      one-time tips
│   │       │   ├── reports/     content moderation
│   │       │   ├── blocked-users/ block/unblock
│   │       │   ├── uploads/     avatar upload
│   │       │   ├── search/      posts, users, forums
│   │       │   ├── intelligence/ brief (JSON)
│   │       │   ├── keyword-alerts/ CRUD
│   │       │   ├── trends/      analytics
│   │       │   ├── wire/        ask, quota
│   │       │   ├── analytics/   batch event tracking
│   │       │   ├── app/         version check
│   │       │   └── subscription, email-preferences, referral, feed-preferences, health
│   │       └── webhooks/        Stripe webhook handler
│   ├── components/              React components
│   ├── lib/                     Shared utilities
│   │   ├── supabase/
│   │   │   ├── client.ts        Browser Supabase client (cookie auth)
│   │   │   ├── server.ts        Server Supabase client (cookie auth)
│   │   │   └── mobile.ts        Mobile Supabase client (Bearer token auth)
│   │   ├── stripe.ts            Stripe client (lazy proxy pattern)
│   │   ├── email.ts             Nodemailer transport + HTML builders
│   │   ├── scraper.ts           Twitter/X scraper (multi-strategy)
│   │   ├── rss-scraper.ts       RSS/YouTube feed scraper
│   │   ├── get-user-plan.ts     Plan resolution (Stripe → IAP → referral → free)
│   │   ├── intelligence-brief.tsx  PDF generation for Intelligence tier
│   │   ├── wire-ai.ts           WIRE AI service (Anthropic Claude, lazy proxy)
│   │   └── analytics.ts         Analytics event tracking
│   └── middleware.ts            Session refresh + referral cookie
├── packages/shared/             Shared constants (@repo/shared)
├── supabase/migrations/         Database migrations (001-009)
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
User clicks "Subscribe" on /pricing or POST /v1/checkout
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

### In-App Purchase Flow

```
Mobile app completes Apple/Google purchase
       │
       ▼
POST /api/v1/iap/validate { platform, product_id, transaction_id, receipt_data }
       │
       ├── Resolve plan from product_id ("pro" or "intelligence")
       ├── Resolve period from product_id ("yearly" = 365d, else 30d)
       ├── Upsert iap_receipts table
       ├── Upsert subscriptions table (source: "iap_apple" | "iap_google")
       └── Track analytics event
              │
              ▼
       Subscription active (getUserPlan returns "pro" or "intelligence")
```

### Plan Resolution

```
getUserPlan(userId)
       │
       ├── 1. Check subscriptions table
       │      Active/trialing with valid current_period_end?
       │      (source: stripe, iap_apple, or iap_google)
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
       From: "The Right Wire" <wire-bot@the-right-wire.com>
```

### WIRE AI Content Generation

```
GitHub Actions cron triggers
       │
       ├── Morning Briefing (7am EST) → GET /api/cron/wire-briefing?type=morning
       ├── Evening Recap (6pm EST) → GET /api/cron/wire-briefing?type=evening
       ├── Hot Takes (every 4h) → GET /api/cron/wire-hot-takes
       ├── Column Draft (Sun midnight) → GET /api/cron/wire-column
       └── Column Publish (Mon 9am EST) → GET /api/cron/wire-column-publish
              │
              ▼
       lib/wire-ai.ts → Anthropic Claude API
       ├── Haiku (claude-haiku-4-5) → commentary, hot takes
       └── Sonnet (claude-sonnet-4-20250514) → briefings, fact checks
              │
              ▼
       Posts/comments inserted as WIRE bot user (UUID: 6ac9f0d2-...)
```

---

## Supabase Client Architecture

Four client factories for different contexts:

| Client | File | Auth Method | Use Case |
|--------|------|-------------|----------|
| Browser | `lib/supabase/client.ts` | Anon key, browser cookies | Client components |
| Server | `lib/supabase/server.ts` | Anon key, `next/headers` cookies | Server components, web API routes |
| Mobile | `lib/supabase/mobile.ts` | Anon key, Bearer token from `Authorization` header | Mobile v1 API routes |
| Admin | Created inline | Service role key, no auth context | Webhooks, cron jobs, IAP, WIRE AI |

**Why four clients?**
- **Browser** runs in the browser and manages cookies automatically
- **Server** reads cookies from the request to identify the user server-side
- **Mobile** extracts Bearer tokens from the `Authorization` header (mobile apps don't use cookies)
- **Admin** bypasses RLS for automated operations where there's no user session

The mobile client also exports:
- `getAdminClient()` — Service role client for IAP validation, WIRE AI, analytics
- `getMobileUser()` — Helper that creates a mobile client and extracts the authenticated user

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
| 2026-02-20 | Bearer token auth for mobile | `lib/supabase/mobile.ts` — mobile apps send `Authorization: Bearer <token>` instead of cookies |
| 2026-02-20 | Mobile client migration | All 44 existing v1 routes migrated from cookie-based `createClient` to `createMobileClient` |
| 2026-02-20 | IAP alongside Stripe | `subscriptions.source` column supports `stripe`, `iap_apple`, `iap_google` — `getUserPlan` resolves uniformly |
| 2026-02-20 | Separate push notification prefs | `notification_preferences` table independent from `email_preferences` — different channels, different defaults |
| 2026-02-20 | App version gating | `app_config` table with `min_version`, `force_update`, `maintenance_mode` — no redeployment needed |

---

## Database Schema Overview

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `profiles` | User profiles (extends auth.users) | username, display_name, avatar_url, bio, referral_code, referral_pro_until, is_bot |
| `posts` | All aggregated content | source (x/user/rss/youtube/wire), content, category, is_breaking, upvote_count, comment_count |
| `comments` | Threaded comments | post_id, user_id, parent_id, content, upvote_count, edited_at |
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
| `subscriptions` | Subscription tracking (Stripe + IAP) | Owner read, service role write. Has `source` column: stripe/iap_apple/iap_google |
| `email_preferences` | Per-user email notification settings | Owner read/write |
| `keyword_alerts` | Intelligence keyword monitors | Owner CRUD |
| `referrals` | Referral tracking | Owner read |
| `analytics_events` | Internal event tracking | Service role only |
| `newsletter_subscribers` | Free newsletter emails | Service role only |
| `affiliate_commissions` | Creator affiliate commissions (20% Intelligence) | Owner read, service role write |
| `iap_receipts` | Apple/Google purchase receipt validation | Owner read, service role write |

### WIRE AI Tables

| Table | Purpose | Access |
|-------|---------|--------|
| `wire_interactions` | Ask WIRE usage tracking + rate limiting | Owner read, service role insert |
| `wire_columns` | Weekly column drafts for admin review | Service role only |
| `wire_config` | Runtime configuration for WIRE behavior (14 keys) | Public read, service role write |

### Mobile Ecosystem Tables

| Table | Purpose | Access |
|-------|---------|--------|
| `device_tokens` | FCM/APNs push notification token registration | Owner CRUD |
| `bookmarks` | User saved posts (unique per user+post) | Owner CRUD |
| `reports` | Content moderation reports (required by app stores) | Owner insert/read, service role for admin review |
| `blocked_users` | User-to-user blocks (unique per pair, no self-block) | Owner CRUD |
| `notification_preferences` | Per-user push notification settings (5 toggles) | Owner read/upsert |
| `notifications` | Notification inbox with read/unread tracking | Owner read/update/delete, service role insert |
| `app_config` | App version checks, feature flags, maintenance mode | Public read, service role write |

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
| Supabase | Postgres database, auth, RLS, storage | Free tier (currently) |
| Stripe | Payment processing (web + mobile checkout) | 2.9% + $0.30 per transaction |
| Gmail SMTP | Email delivery | Free (500/day limit) |
| GitHub Actions | Cron job execution | Free (2000 min/month) |
| Anthropic | Claude API for WIRE AI (Haiku + Sonnet) | ~$5.42/month at Level 2 |
| Apple App Store | iOS app distribution + IAP | 15-30% commission |
| Google Play Store | Android app distribution + IAP | 15-30% commission |

---

## Security Model

- **RLS everywhere** — Every table has Row Level Security policies
- **Server-side price resolution** — Stripe Price IDs never sent from client
- **Bearer token auth for mobile** — `createMobileClient()` extracts and validates JWT from `Authorization` header
- **Cron authentication** — All cron endpoints check `Authorization: Bearer <CRON_SECRET>`
- **Admin hardcoded UUID** — Admin pages check against owner's UUID
- **Service role isolation** — Only used in webhooks, cron, IAP validation, WIRE AI, and referral tracking
- **Cookie-based auth for web** — Supabase session stored in httpOnly cookies via middleware
- **Account deletion** — Requires explicit `"DELETE"` confirmation string
- **Password reset** — Never reveals whether an email exists (prevents enumeration)
- **Self-action prevention** — Cannot self-follow, self-block, or self-refer
