# The Right Wire — Project History & Build Log

> A complete record of every major development session, what was built, and key decisions made.
> This document ensures continuity across sessions and prevents any work from being lost.

---

## Timeline Overview

| Date | Session | Major Deliverables |
|------|---------|-------------------|
| Pre-2026-02-15 | Foundation | Core app: feed, forums, comments, voting, follows, user posts, scraping |
| 2026-02-15 | Phase 1 | Stripe subscriptions, pricing page, legal pages, customer portal |
| 2026-02-15 | Phase 2 | SEO, newsletter, daily digest, referral system, RSS/YouTube scraping |
| 2026-02-16 | Phase 3 | Breaking alerts, custom feed curation, admin dashboard enhancements |
| 2026-02-16–17 | Phase 4 | Wire Intelligence: dashboard, PDF briefs, keyword alerts, trend analytics |
| 2026-02-17 | Mobile API | Complete REST API (26 endpoints) under `/api/v1/*` for Android/iOS |
| 2026-02-17 | WIRE AI Design | Full design document for WIRE AI personality system (5 features) |

---

## Phase 1: Stripe + Subscriptions + Landing Pages

**Session Date:** 2026-02-15
**Status:** ✅ COMPLETE

### What Was Built

1. **Stripe Integration (Live Mode)**
   - Products created: Wire Pro ($6.99/mo, $59.99/yr), Wire Intelligence ($19.99/mo)
   - `customers` and `subscriptions` tables with RLS
   - Webhook handler at `/api/webhooks/stripe` handling 4 events:
     - `checkout.session.completed` → Upsert customer + subscription
     - `customer.subscription.updated` → Update subscription status
     - `customer.subscription.deleted` → Mark canceled
     - `invoice.payment_failed` → Mark past_due
   - `getUserPlan()` helper with priority: Stripe sub → Referral Pro → Free
   - Checkout flow (`/api/checkout`) with server-side price resolution (security measure)
   - Customer Portal (`/api/portal`) for self-service subscription management

2. **Landing & Legal Pages**
   - `/pricing` — 3-tier pricing page (Free, Pro, Intelligence)
   - `/about` — About The Right Wire
   - `/terms` — Terms of Service
   - `/privacy` — Privacy Policy
   - `/refunds` — Refund Policy
   - `/contact` — Contact page

### Key Architecture Decisions

- **Stripe Lazy Proxy:** ES Proxy pattern in `lib/stripe.ts` to avoid build-time crash when env vars aren't set
- **Server-Side Price Resolution:** Client sends `{ plan, billingPeriod }`, server resolves Stripe Price ID from env vars — prevents price ID injection
- **Webhook Service Role Client:** Headless Supabase client bypassing RLS for webhook writes

### Files Created/Modified
- `apps/web/lib/stripe.ts`
- `apps/web/lib/get-user-plan.ts`
- `apps/web/app/api/checkout/route.ts`
- `apps/web/app/api/portal/route.ts`
- `apps/web/app/api/webhooks/stripe/route.ts`
- `apps/web/app/(main)/pricing/page.tsx`
- `apps/web/app/(main)/about/page.tsx`
- `apps/web/app/(main)/terms/page.tsx`
- `apps/web/app/(main)/privacy/page.tsx`
- `apps/web/app/(main)/refunds/page.tsx`
- `apps/web/app/(main)/contact/page.tsx`
- `supabase/migrations/002_monetization_schema.sql`

---

## Phase 2: SEO + Newsletter + Growth Engine

**Session Date:** 2026-02-15
**Status:** ✅ COMPLETE

### What Was Built

1. **SEO Optimization**
   - `generateMetadata()` on post detail pages (`/post/[id]`)
   - Dynamic sitemap at `/sitemap.xml`
   - JSON-LD structured data on post pages

2. **Email Newsletter System**
   - Free email newsletter signup via `/api/newsletter`
   - `newsletter_subscribers` table for anonymous email capture
   - Weekly newsletter cron (GitHub Actions, Monday 8am EST)
   - Daily digest cron for Pro+ users (7am EST)
   - Styled HTML email templates (dark theme, branded)
   - Gmail SMTP via Nodemailer with 500ms inter-email rate limiting

3. **Referral System**
   - Auto-generated 8-char referral codes on signup (MD5 hash)
   - Referral tracking via middleware cookie (`?ref=CODE`, 30-day expiry)
   - Bidirectional rewards: 7 days Wire Pro for both referrer and referred
   - Stackable rewards (days add on top of existing referral Pro time)
   - Referral stats API (`/api/referral`)
   - No credit card required for referral Pro

4. **Multi-Source Scraping**
   - RSS feed scraping (`lib/rss-scraper.ts`)
   - YouTube channel feed scraping
   - Deduplication on `source_id` for RSS/YouTube
   - Automated scraping cron (every 2 hours via GitHub Actions)

### Key Architecture Decisions

- **Referral Cookie Flow:** Middleware intercepts `?ref=CODE`, stores httpOnly cookie, `/api/referral/track` processes after signup
- **Referral Stacking:** If referrer already has unexpired Pro time, new 7 days added to existing expiry (not from now)
- **`getUserPlan()` Fallback:** Checks `referral_pro_until` when no paid sub exists, so referral Pro works without a credit card

### Files Created/Modified
- `apps/web/app/(main)/post/[id]/page.tsx` (metadata)
- `apps/web/app/sitemap.xml/route.ts`
- `apps/web/app/api/newsletter/route.ts`
- `apps/web/app/api/referral/route.ts`
- `apps/web/app/api/referral/track/route.ts`
- `apps/web/app/api/cron/daily-digest/route.ts`
- `apps/web/app/api/cron/weekly-newsletter/route.ts`
- `apps/web/lib/email.ts`
- `apps/web/lib/rss-scraper.ts`
- `apps/web/middleware.ts` (referral cookie)
- `.github/workflows/daily-digest.yml`
- `.github/workflows/weekly-newsletter.yml`
- `supabase/migrations/003_newsletter_subscribers.sql`
- `supabase/migrations/004_referral_codes.sql`
- `supabase/migrations/005_referral_pro_rewards.sql`

---

## Phase 3: Breaking Alerts + Custom Feed Curation

**Session Date:** 2026-02-16
**Status:** ✅ COMPLETE

### What Was Built

1. **Breaking Alerts System**
   - Admin-only breaking alert form in `/admin`
   - `POST /api/admin/breaking-alert` — marks post as breaking, sends emails
   - Email delivery to all Pro+ subscribers (Stripe active/trialing + referral Pro)
   - Respects per-user `email_preferences.breaking_alerts` setting
   - Styled HTML email template with red/urgent theme
   - 500ms rate limiting between emails
   - Posts marked `is_breaking: true` with `breaking_sent_at` timestamp
   - Breaking posts get 🚨 badge and red styling in feed, always bubble to top

2. **Custom Feed Curation**
   - Feed preferences API (`/api/feed-preferences`)
   - Source pinning and muting functionality
   - Home feed applies user preferences (filters muted, prioritizes pinned)
   - Feed settings page for Pro+ users

3. **Email Preferences**
   - `/api/email-preferences` — GET/PUT for per-user notification settings
   - Controls: `daily_digest`, `weekly_newsletter`, `breaking_alerts`
   - Defaults to all enabled if no preferences row exists

### Files Created/Modified
- `apps/web/app/api/admin/breaking-alert/route.ts`
- `apps/web/app/api/feed-preferences/route.ts`
- `apps/web/app/api/email-preferences/route.ts`
- `apps/web/components/breaking-alert-form.tsx`
- `apps/web/app/(main)/admin/page.tsx`
- `apps/web/app/(main)/feed-settings/page.tsx`
- `apps/web/app/(main)/page.tsx` (feed curation logic)
- `apps/web/lib/email.ts` (breaking alert template)

---

## Phase 4: Wire Intelligence

**Session Date:** 2026-02-16–17
**Status:** ✅ COMPLETE

### What Was Built

1. **Intelligence Dashboard (`/dashboard`)**
   - Gated to Intelligence-tier subscribers ($19.99/mo)
   - Real-time stats: stories tracked, breaking alerts, top category
   - PDF Intelligence Brief on-demand download via `@react-pdf/renderer`
   - Keyword alert management UI (create/delete/toggle)
   - Trend snapshot: category breakdown with visual bars, top sources, post volume

2. **Intelligence Brief PDF Generation**
   - `lib/intelligence-brief.tsx` — React PDF component
   - Page 1: Executive summary with stats, trending topics, breaking stories
   - Page 2: Top 15 stories with engagement metrics
   - Trending topic extraction: keyword frequency analysis with stopword filtering
   - `/api/intelligence/brief` — On-demand PDF generation endpoint

3. **Intelligence Brief Auto-Email Cron**
   - `/api/cron/intelligence-brief` — Generates PDF, emails to Intelligence subscribers
   - `.github/workflows/intelligence-brief.yml` — Daily at 6am EST
   - PDF sent as email attachment via updated `sendEmail()` function
   - `lib/email.ts` updated with attachment support

4. **Keyword Alert System**
   - `/api/keyword-alerts` — Full CRUD API
   - Up to 20 keyword monitors per user
   - Active/inactive toggle per alert
   - Dashboard UI for management
   - `keyword_alerts` table (existed from Phase 1 migration, now fully wired)

5. **Trend Analytics**
   - `/api/trends` — Intelligence-gated trend data API
   - Category breakdown with percentages
   - Top sources ranking by post volume
   - 24-hour post volume tracking
   - Visual bar charts in dashboard component

### Files Created/Modified
- `apps/web/app/(main)/dashboard/page.tsx`
- `apps/web/components/intelligence-dashboard.tsx`
- `apps/web/lib/intelligence-brief.tsx`
- `apps/web/app/api/intelligence/brief/route.ts`
- `apps/web/app/api/cron/intelligence-brief/route.ts`
- `apps/web/app/api/keyword-alerts/route.ts`
- `apps/web/app/api/trends/route.ts`
- `apps/web/lib/email.ts` (attachment support)
- `apps/web/components/nav-bar.tsx` (added 📊 Intel link)
- `.github/workflows/intelligence-brief.yml`

### Dependencies Added
- `@react-pdf/renderer` — PDF generation for Intelligence Briefs

---

## Mobile REST API

**Session Date:** 2026-02-17
**Status:** ✅ COMPLETE & DEPLOYED

### What Was Built

A complete REST API under `/api/v1/*` for Android/iOS app development. 26 endpoint files across 6 domains, built by 6 parallel agents simultaneously.

### Auth Endpoints (3 files)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Email/password login → `{ user, session, plan }` |
| POST | `/api/v1/auth/signup` | Registration → `{ user, session }` (session null if email confirm required) |
| POST | `/api/v1/auth/refresh` | Token refresh → `{ session }` with new access/refresh tokens |

### Feed & Posts Endpoints (3 files)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/posts` | Main feed with filters: `?limit&offset&category&source&breaking&sort&q` |
| GET | `/api/v1/posts/[id]` | Single post + threaded comments with author profiles |
| GET | `/api/v1/posts/categories` | Deduplicated category list |

### Comments & Voting Endpoints (4 files)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/comments` | Create comment (supports threading via `parent_id`) |
| DELETE | `/api/v1/comments/[id]` | Delete own comment (ownership check) |
| POST | `/api/v1/votes` | Upvote/downvote (upsert on conflict) |
| DELETE | `/api/v1/votes` | Remove vote |
| GET | `/api/v1/votes/check` | Batch check: `?target_type&target_ids=id1,id2` (max 100) |

### Forums & Community Endpoints (5 files)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/forums` | All forums with member counts |
| GET | `/api/v1/forums/[slug]` | Forum detail + paginated threads |
| POST | `/api/v1/forums/[slug]/threads` | Create thread (title max 300 chars) |
| POST/DELETE | `/api/v1/forums/[slug]/membership` | Join/leave forum (idempotent) |
| GET | `/api/v1/user-posts` | Community posts (optional `?user_id` filter) |
| POST | `/api/v1/user-posts` | Create community post (max 5000 chars) |

### User Profile & Following Endpoints (5 files)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/me` | Authenticated user profile (merges auth email + profile) |
| PATCH | `/api/v1/users/me` | Update profile fields |
| GET | `/api/v1/users/[id]` | Public profile + follower counts + `is_following` |
| POST/DELETE | `/api/v1/follows` | Follow/unfollow (self-follow prevented) |
| GET | `/api/v1/users/[id]/followers` | Paginated followers list |
| GET | `/api/v1/users/[id]/following` | Paginated following list |

### Subscriptions & Settings Endpoints (5 files)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/subscription` | Current plan + subscription + referral pro status |
| GET/PUT | `/api/v1/email-preferences` | Notification settings (strict boolean validation) |
| GET | `/api/v1/referral` | Referral code, stats, reward status |
| GET | `/api/v1/feed-preferences` | Active curated sources list |
| GET | `/api/v1/health` | Health check (no auth, no DB) → `{ status, timestamp, version }` |

### API Design Patterns

- **Consistent error shape:** All errors return `{ error: string }` with appropriate HTTP status codes
- **Status code semantics:** 400 validation, 401 auth, 403 forbidden, 404 not found, 422 processing, 500 internal
- **Pagination:** `?limit=20&offset=0` with limit clamped 1-100, total count included
- **Auth:** `supabase.auth.getUser()` for protected endpoints
- **Next.js 15 pattern:** Async params `{ params }: { params: Promise<{ id: string }> }`
- **Try/catch:** All handlers wrapped with console.error + generic 500 fallback

### Files Created
- `apps/web/app/api/v1/auth/login/route.ts`
- `apps/web/app/api/v1/auth/signup/route.ts`
- `apps/web/app/api/v1/auth/refresh/route.ts`
- `apps/web/app/api/v1/posts/route.ts`
- `apps/web/app/api/v1/posts/[id]/route.ts`
- `apps/web/app/api/v1/posts/categories/route.ts`
- `apps/web/app/api/v1/comments/route.ts`
- `apps/web/app/api/v1/comments/[id]/route.ts`
- `apps/web/app/api/v1/votes/route.ts`
- `apps/web/app/api/v1/votes/check/route.ts`
- `apps/web/app/api/v1/forums/route.ts`
- `apps/web/app/api/v1/forums/[slug]/route.ts`
- `apps/web/app/api/v1/forums/[slug]/threads/route.ts`
- `apps/web/app/api/v1/forums/[slug]/membership/route.ts`
- `apps/web/app/api/v1/user-posts/route.ts`
- `apps/web/app/api/v1/users/me/route.ts`
- `apps/web/app/api/v1/users/[id]/route.ts`
- `apps/web/app/api/v1/follows/route.ts`
- `apps/web/app/api/v1/users/[id]/followers/route.ts`
- `apps/web/app/api/v1/users/[id]/following/route.ts`
- `apps/web/app/api/v1/subscription/route.ts`
- `apps/web/app/api/v1/email-preferences/route.ts`
- `apps/web/app/api/v1/referral/route.ts`
- `apps/web/app/api/v1/feed-preferences/route.ts`
- `apps/web/app/api/v1/health/route.ts`

---

## WIRE AI Personality (Design Phase)

**Session Date:** 2026-02-17
**Status:** 📐 DESIGNED — Ready for Implementation

### Overview

WIRE is The Right Wire's in-house AI personality — a sharp-witted conservative commentator that lives inside the platform. Two modes: **Commentator Mode** (witty, opinionated, Haiku) and **Facts Mode** (textbook-accurate, no spin, Sonnet).

### 5 Planned Features

| # | Feature | Model | Monthly Cost |
|---|---------|-------|-------------|
| 1 | Morning Briefing & Evening Recap | Haiku | $0.06 |
| 2 | Breaking News Auto-Comments | Haiku | $0.06 |
| 3 | Ask WIRE (user Q&A, plan-gated) | Haiku + Sonnet | $5.10 |
| 4 | Hot Take Comments (engagement-triggered) | Haiku | $0.12 |
| 5 | Weekly Editorial Column (Intelligence-gated) | Sonnet | $0.08 |
| | **Total at Level 2** | | **$5.42/month** |

### Design Document

Full specification at: `docs/plans/2026-02-17-wire-ai-personality-design.md`

Covers: database schema, API endpoints, GitHub Actions workflows, prompt templates, rate limiting, admin controls, cost projections, and Level 3 scaling path.

---

## GitHub Actions Workflows

| Workflow File | Schedule | Purpose |
|---------------|----------|---------|
| `scrape-cron.yml` | Every 2 hours | Scrape X/Twitter + RSS/YouTube feeds |
| `daily-digest.yml` | Daily 7am EST | Email digest to Pro+ subscribers |
| `weekly-newsletter.yml` | Monday 8am EST | Free newsletter to subscribers |
| `intelligence-brief.yml` | Daily 6am EST | Intelligence Brief PDF email |
| *(Planned)* `wire-morning-briefing.yml` | Daily 7am EST | WIRE morning briefing post |
| *(Planned)* `wire-evening-recap.yml` | Daily 9pm EST | WIRE evening recap post |
| *(Planned)* `wire-hot-takes.yml` | Every 30 min | WIRE engagement-triggered comments |
| *(Planned)* `wire-column-generate.yml` | Sunday 7pm EST | WIRE weekly column draft |
| *(Planned)* `wire-column-publish.yml` | Monday 7am EST | Publish approved WIRE column |

---

## Deployment History

| Date | Type | Notes |
|------|------|-------|
| 2026-02-15 | Production | Phase 1 + 2 initial deployment |
| 2026-02-16 | Production | Phase 3 (breaking alerts, feed curation) |
| 2026-02-17 | Production | Phase 4 (Intelligence) + Mobile API (26 endpoints) |

All deployments via: `cd "J:\political news app" && npx vercel --prod --yes --token <TOKEN>`

Build pipeline: Turborepo → Next.js build → Vercel serverless functions

---

## Database Migrations (Cumulative)

| File | Content |
|------|---------|
| `001_initial_schema.sql` | Core tables: profiles, curated_sources, posts, comments, votes, forums, forum_memberships, forum_threads, follows, user_posts |
| `002_add_rss_source_type.sql` | Multi-source posts (rss, youtube), external_url, source_id |
| `002_monetization_schema.sql` | customers, subscriptions, email_preferences, keyword_alerts, referrals, analytics_events |
| `003_newsletter_subscribers.sql` | newsletter_subscribers table |
| `004_referral_codes.sql` | profiles.referral_code + auto-generation trigger |
| `005_referral_pro_rewards.sql` | profiles.referral_pro_until for stackable rewards |
| *(Pending)* `006_wire_ai.sql` | profiles.is_bot, wire source type, wire_interactions, wire_columns, wire_config |

---

## Total Route Count

As of 2026-02-17: **56 routes** (all compiled and deployed)

- 20 page routes (feed, forums, community, auth, admin, legal, settings, dashboard)
- 36 API routes (web app + mobile v1 + cron + admin + webhooks)
