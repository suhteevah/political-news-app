# The Right Wire — Mobile REST API Documentation

> Complete reference for the `/api/v1/*` REST API powering Android/iOS apps.
> Base URL: `https://the-right-wire.com/api/v1`
> Last updated: 2026-02-17

---

## Overview

The mobile API provides 26 endpoints across 6 domains: authentication, posts/feed, comments/voting, forums/community, user profiles/following, and subscriptions/settings.

### Base URL

```
Production: https://the-right-wire.com/api/v1
```

### Authentication

Most endpoints that modify data require authentication. The API uses Supabase Auth tokens.

**Login Flow:**
1. `POST /auth/login` with `{ email, password }` → receive `{ session: { access_token, refresh_token } }`
2. Include `access_token` as a cookie or in the Supabase client headers for subsequent requests
3. When token expires, call `POST /auth/refresh` with the `refresh_token`

### Error Format

All errors return a consistent JSON shape:

```json
{
  "error": "Human-readable error message"
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (new resource) |
| 400 | Bad request / validation error |
| 401 | Not authenticated |
| 403 | Forbidden (not authorized for this action) |
| 404 | Resource not found |
| 422 | Unprocessable (e.g., email already taken) |
| 500 | Internal server error |

### Pagination

Paginated endpoints accept:
- `?limit=20` — Results per page (default: 20, min: 1, max: 100)
- `?offset=0` — Number of results to skip

Paginated responses include:
```json
{
  "data": [...],
  "total": 1234,
  "limit": 20,
  "offset": 0
}
```

---

## Authentication

### POST `/auth/login`

Login with email and password.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Success Response (200):**
```json
{
  "user": { "id": "uuid", "email": "user@example.com" },
  "session": {
    "access_token": "eyJ...",
    "refresh_token": "abc...",
    "expires_at": 1234567890
  },
  "plan": "free" | "pro" | "intelligence"
}
```

**Notes:**
- `plan` is included so the mobile app can configure UI immediately without a separate call
- Returns 401 if credentials are invalid

---

### POST `/auth/signup`

Register a new account.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Success Response (200):**
```json
{
  "user": { "id": "uuid", "email": "user@example.com" },
  "session": { ... } | null
}
```

**Notes:**
- `session` may be `null` if email confirmation is required — show "check your email" flow
- Returns 422 if email is taken or password is too weak

---

### POST `/auth/refresh`

Refresh an expired access token.

**Body:**
```json
{
  "refresh_token": "abc..."
}
```

**Success Response (200):**
```json
{
  "session": {
    "access_token": "eyJ...",
    "refresh_token": "new_abc...",
    "expires_at": 1234567890
  }
}
```

---

## Posts & Feed

### GET `/posts`

Main news feed with filtering and sorting.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 20 | Results per page (1-100) |
| `offset` | number | 0 | Pagination offset |
| `category` | string | — | Filter by category name |
| `source` | string | — | Filter by source type: `x`, `rss`, `youtube`, `user` |
| `breaking` | string | — | Set to `"true"` for breaking news only |
| `sort` | string | `latest` | `latest` (by date) or `top` (by upvotes) |
| `q` | string | — | Search content (case-insensitive) |

**Success Response (200):**
```json
{
  "posts": [
    {
      "id": "uuid",
      "content": "Post content...",
      "source": "x",
      "category": "Politics",
      "x_tweet_id": "123456",
      "external_url": "https://...",
      "is_breaking": false,
      "upvote_count": 42,
      "comment_count": 7,
      "created_at": "2026-02-17T..."
    }
  ],
  "total": 1234,
  "limit": 20,
  "offset": 0
}
```

---

### GET `/posts/:id`

Single post with all comments.

**Success Response (200):**
```json
{
  "post": { ... },
  "comments": [
    {
      "id": "uuid",
      "content": "Comment text",
      "parent_id": null,
      "upvote_count": 5,
      "created_at": "2026-02-17T...",
      "profiles": {
        "username": "patriot1776",
        "display_name": "Freedom Fan",
        "avatar_url": "https://..."
      }
    }
  ]
}
```

**Notes:**
- Comments are returned as a flat array ordered by `created_at` ascending
- Client handles threading via `parent_id`

---

### GET `/posts/categories`

All available post categories.

**Success Response (200):**
```json
{
  "categories": ["Breaking News", "Economy", "Elections", "Media Watch", "Policy", "Politics"]
}
```

---

## Comments

### POST `/comments` 🔒

Create a comment on a post. **Requires authentication.**

**Body:**
```json
{
  "post_id": "uuid",
  "content": "This is my comment",
  "parent_id": "uuid" // optional — for threaded replies
}
```

**Success Response (201):**
```json
{
  "comment": { ... }
}
```

**Notes:**
- If `parent_id` is provided, it must belong to the same post
- Post must exist (returns 400 if not found)

---

### DELETE `/comments/:id` 🔒

Delete your own comment. **Requires authentication.**

**Success Response (200):**
```json
{
  "success": true
}
```

**Notes:**
- Returns 403 if you don't own the comment
- Returns 404 if comment doesn't exist

---

## Voting

### POST `/votes` 🔒

Cast or change a vote. **Requires authentication.**

**Body:**
```json
{
  "target_type": "post" | "comment",
  "target_id": "uuid",
  "value": 1 | -1
}
```

**Success Response (200):**
```json
{
  "vote": { ... }
}
```

**Notes:**
- Uses upsert — re-voting updates the existing vote
- Database triggers auto-update `upvote_count` on the target

---

### DELETE `/votes` 🔒

Remove a vote. **Requires authentication.**

**Body:**
```json
{
  "target_type": "post" | "comment",
  "target_id": "uuid"
}
```

**Success Response (200):**
```json
{
  "success": true
}
```

---

### GET `/votes/check` 🔒

Batch check your votes on multiple items. **Requires authentication.**

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `target_type` | string | `post` or `comment` |
| `target_ids` | string | Comma-separated UUIDs (max 100) |

**Example:** `GET /votes/check?target_type=post&target_ids=uuid1,uuid2,uuid3`

**Success Response (200):**
```json
{
  "votes": {
    "uuid1": 1,
    "uuid3": -1
  }
}
```

**Notes:**
- Missing keys = user hasn't voted on that item
- Max 100 IDs per request

---

## Forums & Community

### GET `/forums`

List all forums with member counts.

**Success Response (200):**
```json
{
  "forums": [
    {
      "id": "uuid",
      "name": "Breaking News",
      "slug": "breaking-news",
      "description": "Latest breaking news discussion",
      "created_at": "...",
      "member_count": 42
    }
  ]
}
```

---

### GET `/forums/:slug`

Forum detail with paginated threads.

**Query Parameters:** `?limit=20&offset=0`

**Success Response (200):**
```json
{
  "forum": { "id": "uuid", "name": "...", "slug": "...", "member_count": 42 },
  "threads": [
    {
      "id": "uuid",
      "title": "Thread title",
      "content": "Thread body",
      "is_pinned": false,
      "created_at": "...",
      "profiles": { "username": "...", "display_name": "...", "avatar_url": "..." }
    }
  ],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

**Notes:**
- Threads ordered by `is_pinned DESC, created_at DESC`

---

### POST `/forums/:slug/threads` 🔒

Create a new thread. **Requires authentication.**

**Body:**
```json
{
  "title": "Thread title (max 300 chars)",
  "content": "Thread body text"
}
```

**Success Response (201):**
```json
{
  "thread": { ... }
}
```

---

### POST `/forums/:slug/membership` 🔒

Join a forum. **Requires authentication.**

**Success Response (200):**
```json
{
  "joined": true
}
```

**Notes:** Idempotent — joining twice is a no-op.

---

### DELETE `/forums/:slug/membership` 🔒

Leave a forum. **Requires authentication.**

**Success Response (200):**
```json
{
  "left": true
}
```

---

### GET `/user-posts`

Community/user posts feed.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 20 | Results per page (1-100) |
| `offset` | number | 0 | Pagination offset |
| `user_id` | string | — | Filter to specific user's posts |

**Success Response (200):**
```json
{
  "posts": [ ... ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

---

### POST `/user-posts` 🔒

Create a community post. **Requires authentication.**

**Body:**
```json
{
  "content": "My community post (max 5000 chars)"
}
```

**Success Response (201):**
```json
{
  "post": { ... }
}
```

---

## User Profiles & Social

### GET `/users/me` 🔒

Get your profile. **Requires authentication.**

**Success Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "patriot1776",
  "display_name": "Freedom Fan",
  "avatar_url": "https://...",
  "bio": "Love my country",
  "referral_code": "9886b7b6",
  "created_at": "..."
}
```

---

### PATCH `/users/me` 🔒

Update your profile. **Requires authentication.**

**Body (all fields optional):**
```json
{
  "username": "new_username",
  "display_name": "New Name",
  "bio": "Updated bio",
  "avatar_url": "https://new-avatar.com/pic.jpg"
}
```

**Success Response (200):**
```json
{
  "profile": { ... }
}
```

---

### GET `/users/:id`

Get any user's public profile.

**Success Response (200):**
```json
{
  "id": "uuid",
  "username": "patriot1776",
  "display_name": "Freedom Fan",
  "avatar_url": "https://...",
  "bio": "Love my country",
  "created_at": "...",
  "follower_count": 42,
  "following_count": 18,
  "is_following": true
}
```

**Notes:**
- `is_following` only included if the requester is authenticated

---

### POST `/follows` 🔒

Follow a user. **Requires authentication.**

**Body:**
```json
{
  "user_id": "uuid-of-user-to-follow"
}
```

**Success Response (200):**
```json
{
  "followed": true
}
```

**Notes:**
- Self-follow returns 400
- Target user must exist (404 if not)
- Idempotent via upsert

---

### DELETE `/follows` 🔒

Unfollow a user. **Requires authentication.**

**Body:**
```json
{
  "user_id": "uuid-of-user-to-unfollow"
}
```

**Success Response (200):**
```json
{
  "unfollowed": true
}
```

---

### GET `/users/:id/followers`

Paginated list of a user's followers.

**Query Parameters:** `?limit=20&offset=0`

**Success Response (200):**
```json
{
  "followers": [
    { "id": "uuid", "username": "...", "display_name": "...", "avatar_url": "..." }
  ],
  "total": 42
}
```

---

### GET `/users/:id/following`

Paginated list of who a user follows.

**Query Parameters:** `?limit=20&offset=0`

**Success Response (200):**
```json
{
  "following": [
    { "id": "uuid", "username": "...", "display_name": "...", "avatar_url": "..." }
  ],
  "total": 18
}
```

---

## Subscriptions & Settings

### GET `/subscription` 🔒

Get current subscription status. **Requires authentication.**

**Success Response (200):**
```json
{
  "plan": "free" | "pro" | "intelligence",
  "subscription": {
    "stripe_subscription_id": "sub_...",
    "plan": "pro",
    "status": "active",
    "current_period_end": "2026-03-17T...",
    "cancel_at_period_end": false
  } | null,
  "referral_pro_until": "2026-02-24T..." | null
}
```

---

### GET `/email-preferences` 🔒

Get email notification settings. **Requires authentication.**

**Success Response (200):**
```json
{
  "preferences": {
    "daily_digest": true,
    "weekly_newsletter": true,
    "breaking_alerts": true
  }
}
```

**Notes:** Returns defaults if no preferences row exists.

---

### PUT `/email-preferences` 🔒

Update email notification settings. **Requires authentication.**

**Body (all fields optional, must be booleans):**
```json
{
  "daily_digest": false,
  "breaking_alerts": true
}
```

**Success Response (200):**
```json
{
  "preferences": { ... }
}
```

---

### GET `/referral` 🔒

Get referral stats. **Requires authentication.**

**Success Response (200):**
```json
{
  "referral_code": "9886b7b6",
  "total_referrals": 5,
  "completed_referrals": 3,
  "referral_pro_until": "2026-03-07T..."
}
```

---

### GET `/feed-preferences`

Get active curated sources (for feed customization UI). **No authentication required.**

**Success Response (200):**
```json
{
  "sources": [
    {
      "id": "uuid",
      "x_handle": "RealDonaldTrump",
      "display_name": "Donald Trump",
      "category": "Politicians",
      "is_active": true
    }
  ]
}
```

---

### GET `/health`

API health check. **No authentication required. No database call.**

**Success Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-02-17T06:29:16.427Z",
  "version": "1.0.0"
}
```

---

## Quick Reference

### Endpoints by Auth Requirement

**Public (no auth):**
- GET `/posts`, `/posts/:id`, `/posts/categories`
- GET `/forums`, `/forums/:slug`
- GET `/user-posts`
- GET `/users/:id`, `/users/:id/followers`, `/users/:id/following`
- GET `/feed-preferences`
- GET `/health`

**Authenticated:**
- All POST, PATCH, DELETE endpoints
- GET `/users/me`, `/subscription`, `/email-preferences`, `/referral`, `/votes/check`
