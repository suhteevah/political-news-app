# WIRE AI Personality System — Design Document

> The Right Wire's in-house AI personality that posts, comments, and answers questions.
> Approved: 2026-02-17

---

## 1. OVERVIEW

WIRE is The Right Wire's AI personality — a sharp-witted conservative commentator that lives inside the platform. It posts daily briefings, drops comments on breaking and trending stories, answers user questions, and writes a weekly editorial column.

WIRE has **two distinct modes**:

1. **Commentator Mode** — Sharp, opinionated, witty. Conservative editorial voice with bite. Used for comments, hot takes, briefings, and the weekly column. Powered by **Claude Haiku** for cost efficiency.

2. **Facts Mode** — Textbook-accurate, no spin, no slant. Only hard documented facts. Used when users explicitly ask WIRE for factual information. Powered by **Claude Sonnet** for accuracy.

The system is designed for **Level 2 activity** (~10-20 interactions/day) with architecture that scales to **Level 3** (~20-40/day) by changing config values — no code changes needed.

**Estimated monthly cost at Level 2: ~$5.42/month.**

---

## 2. WIRE'S IDENTITY

### Profile

| Field | Value |
|-------|-------|
| Username | `wire` |
| Display Name | `WIRE` |
| Avatar | Custom WIRE logo/icon (distinct from user avatars) |
| Bio | "The Right Wire's AI. Sharp takes. Hard facts on request. 🔌" |
| UUID | Auto-generated on profile creation |
| Is Bot | `true` (new column on `profiles`) |

WIRE's profile row in `profiles` will have `is_bot: true` so the UI can render it differently (verified badge, distinct styling, no "follow" button).

### Voice Guidelines (embedded in system prompts)

**Commentator Mode:**
- Conservative editorial perspective
- Punchy, concise — rarely more than 2 sentences for comments
- Occasional wit and sarcasm, never mean-spirited toward users
- References "the mainstream media," "the wire," "patriots"
- Self-aware that it's an AI — doesn't pretend to be human, but has personality
- Examples:
  - "The mainstream media will pick this up in about 48 hours. You heard it here first."
  - "50 comments and counting. This is why they don't want you talking to each other."
  - "Called this one three weeks ago. The wire doesn't miss."

**Facts Mode:**
- Strictly factual — no editorial framing
- Cites what is documented vs. what is disputed
- Clearly states limitations: "Based on available information..." / "This is disputed by..."
- No conservative or liberal spin — hard textbook facts only
- If WIRE doesn't know or the facts are unclear, it says so
- Examples:
  - "Here are the documented facts: The bill was introduced on [date] by [sponsor]. It passed the House 220-215 on [date]. The Senate vote is scheduled for [date]. The bill's key provisions include..."
  - "This is a contested claim. Supporters cite [X]. Critics cite [Y]. The available data shows [Z]."

---

## 3. FEATURE SPECIFICATIONS

### Feature 1: Morning Briefing & Evening Recap (Cron Posts)

**Schedule:**
- Morning Briefing: Daily at 7:00 AM EST (12:00 UTC)
- Evening Recap: Daily at 9:00 PM EST (02:00 UTC next day)

**Implementation:**
1. GitHub Actions cron triggers `GET /api/cron/wire-briefing?type=morning|evening`
2. Endpoint authenticates via `CRON_SECRET`
3. Queries top posts from the relevant window:
   - Morning: Top 5 posts from last 12 hours by `upvote_count`
   - Evening: Top 3 posts from last 12 hours by `upvote_count + comment_count`
4. Builds a minimal prompt with post titles, categories, and engagement numbers (NOT full content — saves tokens)
5. Calls Claude Haiku with the commentator system prompt
6. Inserts result as a post in the `posts` table with `source: 'wire'` and `user_id: <WIRE_USER_ID>`

**Prompt Template (Morning):**
```
You are WIRE, The Right Wire's AI personality. Write a morning briefing post.
Voice: Sharp, witty conservative commentator. Punchy and concise.
Format: Opening line + 3-5 bullet points with brief commentary on each + closing line.
Keep it under 250 words total.

Top stories in the last 12 hours:
{{#each posts}}
- "{{title}}" ({{category}}) — {{upvote_count}} upvotes, {{comment_count}} comments
{{/each}}
```

**Token Budget:** ~400 input + 300 output = 700 tokens per briefing. **~$0.001/briefing.**

**New Source Type:** Add `wire` to the posts source constraint: `source IN ('x', 'user', 'rss', 'youtube', 'wire')`.

**Post Display:** WIRE posts get a distinct card style — subtle lightning bolt icon, "WIRE" badge, slightly different background tint.

---

### Feature 2: Breaking News Auto-Comments

**Trigger:** Fires automatically when a post is marked as breaking via the existing admin breaking alert system.

**Implementation:**
1. After the existing breaking alert logic in `/api/admin/breaking-alert` marks a post as breaking and sends emails, it makes an internal call to a new function `generateWireComment()`
2. `generateWireComment()` takes the post title and category
3. Calls Claude Haiku with the commentator system prompt
4. Inserts the response as a comment on the post with `user_id: <WIRE_USER_ID>`

**Prompt Template:**
```
You are WIRE, The Right Wire's AI personality.
Voice: Sharp, witty conservative commentator.
Write a 1-2 sentence comment reacting to this breaking news story.
Be punchy. Set the tone for the comment section.

Breaking story: "{{post_title}}" ({{category}})
```

**Token Budget:** ~100 input + 50 output = 150 tokens. **~$0.0005/comment.**

**Rate Limit:** Max 5 auto-comments per day (configurable via `WIRE_MAX_BREAKING_COMMENTS_PER_DAY` env var).

---

### Feature 3: Ask WIRE (User-Triggered Q&A)

**User Interface:**
- In any comment thread, users can type `@wire` followed by a question
- Alternatively, a dedicated "Ask WIRE" button on the post detail page opens a focused input
- WIRE's response appears as a reply comment in the thread

**Mode Detection:**
- If the question contains trigger phrases like "what are the facts," "factually," "what actually happened," "is it true that," "fact check" → **Facts Mode** (Sonnet)
- Otherwise → **Commentator Mode** (Haiku)
- Users can also explicitly prefix with `@wire [facts]` to force facts mode

**Rate Limits by Plan:**

| Plan | Daily Ask WIRE Limit |
|------|---------------------|
| Free | 3 |
| Wire Pro | 10 |
| Wire Intelligence | 25 |

**Site-Wide Daily Cap:** 500 total Ask WIRE interactions (configurable via `WIRE_MAX_DAILY_ASKS` env var). Prevents runaway costs even if the site goes viral.

**Implementation:**
1. New API endpoint: `POST /api/wire/ask`
   - Body: `{ post_id: string, question: string, parent_comment_id?: string }`
   - Authenticates user, checks rate limit
   - Detects mode from question text
   - Calls Claude (Haiku or Sonnet depending on mode)
   - Inserts response as a comment from WIRE's user ID
   - Returns the created comment

2. Rate limit tracking: New table `wire_interactions` or use `analytics_events` with event_type `wire_ask`

3. Client-side: New `AskWireButton` component that appears on post detail pages

**Prompt Templates:**

Commentator Mode:
```
You are WIRE, The Right Wire's AI personality.
Voice: Sharp, witty conservative commentator. Concise.
A user asked you a question in a comment thread.
Keep your response under 150 words. Be direct and entertaining.

Post context: "{{post_title}}" ({{category}})
User's question: "{{question}}"
```

Facts Mode:
```
You are WIRE, The Right Wire's AI assistant in facts-only mode.
Voice: Strictly factual. No editorial spin in any direction.
Cite documented facts. State when something is disputed or unverified.
If you don't know, say so clearly.
Keep your response under 250 words.

Post context: "{{post_title}}" ({{category}})
User's question: "{{question}}"
```

**Token Budget:**
- Commentator (Haiku): ~200 input + 150 output = 350 tokens. ~$0.0003/interaction
- Facts (Sonnet): ~200 input + 300 output = 500 tokens. ~$0.005/interaction

---

### Feature 4: Hot Take Comments (Engagement-Triggered)

**Trigger Thresholds (configurable via env vars):**

| Trigger | Threshold | Default |
|---------|-----------|---------|
| Upvote velocity | X upvotes in Y minutes | 20 upvotes in 60 min |
| Comment surge | X comments in Y minutes | 15 comments in 60 min |
| Trend detection | 2+ posts on same topic trending | Same category, both >10 upvotes |

**Implementation:**
1. New cron endpoint: `GET /api/cron/wire-hot-takes`
2. GitHub Actions runs every 30 minutes
3. Queries for posts meeting threshold criteria that WIRE hasn't already commented on
4. For each qualifying post (max 3 per run), generates a one-liner via Haiku
5. Inserts as comments from WIRE's user ID

**Deduplication:** `wire_comments` tracking table or a flag on the comment to prevent WIRE from commenting on the same post twice.

**Prompt Template:**
```
You are WIRE, The Right Wire's AI personality.
Voice: Sharp, witty conservative commentator.
Write a single punchy sentence about this post that's blowing up.
Reference the engagement if it fits naturally.

Post: "{{post_title}}" ({{category}})
Engagement: {{upvote_count}} upvotes, {{comment_count}} comments in {{time_window}}
```

**Token Budget:** ~100 input + 40 output = 140 tokens. **~$0.0004/comment.**

**Daily Cap:** `WIRE_MAX_HOT_TAKES_PER_DAY` env var, default 8.

---

### Feature 5: WIRE's Weekly Column (Intelligence Tier)

**Schedule:** Generated Sunday 7:00 PM EST. Published Monday 7:00 AM EST (with admin kill switch).

**Implementation:**
1. **Generation Cron** (Sunday 7pm): `GET /api/cron/wire-column`
   - Queries top 20 posts from the past 7 days (by upvote_count + comment_count)
   - Includes category distribution and engagement stats
   - Calls Claude Sonnet with the editorial system prompt
   - Saves the generated column to a new `wire_columns` table with `status: 'pending'`
   - Sends preview email to the admin (owner) for review

2. **Publish Cron** (Monday 7am): `GET /api/cron/wire-column-publish`
   - Checks for pending columns that haven't been killed by admin
   - Inserts as a post with `source: 'wire'` and a special `is_column: true` flag
   - Marks column as `status: 'published'`

3. **Admin Kill Switch:** Admin dashboard gets a "Pending WIRE Column" section showing the preview with "Approve" / "Kill" buttons. If killed, the Monday publish cron skips it.

4. **Visibility Gating:**
   - All users see the column in the feed with a preview (first ~100 words)
   - Full column requires Intelligence subscription
   - "Upgrade to read WIRE's full analysis" CTA for non-Intelligence users

**Prompt Template:**
```
You are WIRE, The Right Wire's editorial AI.
Voice: Conservative editorial columnist. Insightful, connects dots between stories.
Sharp but substantive. Write with authority.

Write a 500-800 word weekly column titled "WIRE's Week in Review" covering the biggest stories.
Connect themes across stories where possible.
End with a forward-looking observation about next week.

This week's top stories (by engagement):
{{#each posts}}
{{@index}}. "{{title}}" ({{category}}) — {{upvote_count}} upvotes, {{comment_count}} comments
   Snippet: {{content_preview}}
{{/each}}

Category breakdown this week:
{{#each categories}}
- {{name}}: {{count}} stories
{{/each}}
```

**Token Budget:** ~2000 input + 1000 output = 3000 tokens. **~$0.02/column. ~$0.08/month.**

---

## 4. DATABASE CHANGES

### New Column: `profiles.is_bot`
```sql
ALTER TABLE profiles ADD COLUMN is_bot boolean NOT NULL DEFAULT false;
```

### New Source Type
```sql
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_source_check;
ALTER TABLE posts ADD CONSTRAINT posts_source_check
  CHECK (source IN ('x', 'user', 'rss', 'youtube', 'wire'));
```

### New Table: `wire_interactions`
Tracks Ask WIRE usage for rate limiting.
```sql
CREATE TABLE wire_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  response text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('commentator', 'facts')),
  model text NOT NULL,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for rate limiting queries
CREATE INDEX idx_wire_interactions_user_day
  ON wire_interactions (user_id, created_at);

-- RLS: users can read their own interactions
ALTER TABLE wire_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own interactions"
  ON wire_interactions FOR SELECT USING (auth.uid() = user_id);
-- Service role inserts (no user insert policy)
```

### New Table: `wire_columns`
Stores weekly column drafts for admin review.
```sql
CREATE TABLE wire_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'killed')),
  post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  model text NOT NULL,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  published_at timestamptz
);

ALTER TABLE wire_columns ENABLE ROW LEVEL SECURITY;
-- No public access — admin only via service role
```

### New Table: `wire_config`
Runtime configuration for WIRE's behavior (avoids redeployment for tuning).
```sql
CREATE TABLE wire_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Seed default config
INSERT INTO wire_config (key, value) VALUES
  ('enabled', 'true'),
  ('daily_ask_limit_free', '3'),
  ('daily_ask_limit_pro', '10'),
  ('daily_ask_limit_intelligence', '25'),
  ('site_wide_daily_ask_cap', '500'),
  ('max_breaking_comments_per_day', '5'),
  ('max_hot_takes_per_day', '8'),
  ('hot_take_upvote_threshold', '20'),
  ('hot_take_comment_threshold', '15'),
  ('hot_take_window_minutes', '60'),
  ('briefing_enabled', 'true'),
  ('column_enabled', 'true'),
  ('commentator_model', '"haiku"'),
  ('facts_model', '"sonnet"');

ALTER TABLE wire_config ENABLE ROW LEVEL SECURITY;
-- Public read so the client can check if WIRE is enabled
CREATE POLICY "Public read wire config"
  ON wire_config FOR SELECT USING (true);
-- Only service role can update
```

---

## 5. NEW API ENDPOINTS

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/wire/ask` | POST | User | Ask WIRE a question (creates comment) |
| `/api/cron/wire-briefing` | GET | Cron | Generate morning/evening briefing post |
| `/api/cron/wire-hot-takes` | GET | Cron | Check for engagement spikes, post comments |
| `/api/cron/wire-column` | GET | Cron | Generate weekly column draft |
| `/api/cron/wire-column-publish` | GET | Cron | Publish approved weekly column |
| `/api/admin/wire-column` | GET/POST | Admin | Preview pending column, approve/kill |
| `/api/admin/wire-config` | GET/PUT | Admin | View/update WIRE configuration |

---

## 6. NEW GITHUB ACTIONS WORKFLOWS

| Workflow | Schedule | Endpoint |
|----------|----------|----------|
| `wire-morning-briefing.yml` | `0 12 * * *` (7am EST) | `/api/cron/wire-briefing?type=morning` |
| `wire-evening-recap.yml` | `0 2 * * *` (9pm EST) | `/api/cron/wire-briefing?type=evening` |
| `wire-hot-takes.yml` | `*/30 * * * *` (every 30 min) | `/api/cron/wire-hot-takes` |
| `wire-column-generate.yml` | `0 0 * * 1` (Sun 7pm EST) | `/api/cron/wire-column` |
| `wire-column-publish.yml` | `0 12 * * 1` (Mon 7am EST) | `/api/cron/wire-column-publish` |

---

## 7. NEW COMPONENTS

| Component | Purpose |
|-----------|---------|
| `WirePostCard` | Distinct card styling for WIRE's posts (briefings, columns) |
| `WireBadge` | "WIRE" verified badge on WIRE's comments and posts |
| `AskWireButton` | Button on post detail pages to ask WIRE a question |
| `AskWireModal` | Modal/input for composing a question to WIRE |
| `WireColumnPreview` | Admin component for reviewing pending columns |
| `WireConfigPanel` | Admin panel for tuning WIRE's configuration |

---

## 8. NEW DEPENDENCIES

| Package | Purpose |
|---------|---------|
| `@anthropic-ai/sdk` | Claude API client for Haiku and Sonnet calls |

No other new dependencies. Everything else uses existing infrastructure.

---

## 9. ENVIRONMENT VARIABLES

| Key | Value | Purpose |
|-----|-------|---------|
| `ANTHROPIC_API_KEY` | (from Anthropic console) | Claude API authentication |
| `WIRE_USER_ID` | (UUID of WIRE's profile) | Identity for WIRE's posts/comments |

All other configuration lives in the `wire_config` table and can be tuned at runtime without redeployment.

---

## 10. COST PROJECTIONS

### Level 2 (Launch — ~10-20 interactions/day)

| Feature | Daily Cost | Monthly Cost |
|---------|-----------|-------------|
| Morning Briefing + Evening Recap | $0.002 | $0.06 |
| Breaking News Comments (1-3/day) | $0.002 | $0.06 |
| Ask WIRE (~50 interactions/day) | $0.17 | $5.10 |
| Hot Take Comments (5-8/day) | $0.004 | $0.12 |
| Weekly Column (1/week) | $0.003 | $0.08 |
| **Total** | **$0.18/day** | **$5.42/month** |

### Level 3 (Revenue Phase — ~20-40 interactions/day)

| Feature | Daily Cost | Monthly Cost |
|---------|-----------|-------------|
| Morning Briefing + Evening Recap | $0.002 | $0.06 |
| Breaking News Comments (3-5/day) | $0.003 | $0.09 |
| Ask WIRE (~150 interactions/day) | $0.50 | $15.00 |
| Hot Take Comments (8-12/day) | $0.006 | $0.18 |
| Weekly Column (1/week) | $0.003 | $0.08 |
| WIRE Original Posts (1-2/day) | $0.003 | $0.09 |
| **Total** | **$0.51/day** | **$15.50/month** |

Even at Level 3, WIRE costs less than a single Wire Pro subscriber pays per month ($6.99). One subscriber covers WIRE's entire operating cost.

---

## 11. IMPLEMENTATION ORDER

1. **Database migration** — Add `is_bot`, `wire` source type, new tables
2. **WIRE profile creation** — Create the bot user account
3. **AI service layer** — `lib/wire-ai.ts` with Claude client, prompt templates, mode detection
4. **Feature 1: Briefings** — Cron endpoints + GitHub Actions + post card styling
5. **Feature 2: Breaking comments** — Hook into existing breaking alert flow
6. **Feature 4: Hot takes** — Cron endpoint + engagement detection queries
7. **Feature 3: Ask WIRE** — API endpoint + UI components + rate limiting
8. **Feature 5: Weekly column** — Generation + admin review + publish flow + gating
9. **Admin config panel** — Wire config management in admin dashboard

Features 1, 2, and 4 are the cheapest and fastest to build. Feature 3 is the most complex (user-facing, rate limiting, mode detection). Feature 5 requires the most careful prompt engineering.

---

## 12. SCALING TO LEVEL 3

When revenue justifies it, Level 3 adds:
- **WIRE Original Posts** (1-2/day) — WIRE creates standalone commentary posts on trending topics
- **Increased Ask WIRE limits** — Higher per-user and site-wide caps
- **More Hot Takes** — Lower engagement thresholds, more frequent checks
- **WIRE Thread Participation** — WIRE joins active forum threads unprompted

All of these are config changes in `wire_config` — no code changes needed. The architecture supports Level 3 from day one.
