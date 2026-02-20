# The Right Wire — Mobile REST API Documentation

> Complete reference for the `/api/v1/*` REST API powering Android/iOS apps.
> Base URL: `https://the-right-wire.com/api/v1`
> Last updated: 2026-02-20

---

## Overview

The mobile API provides 53 route files across 12 domains: authentication, posts/feed, comments/voting, forums/community, user profiles/following, subscriptions/settings, bookmarks, notifications, in-app purchases, payments, content moderation, and WIRE AI.

All endpoints use Bearer token authentication via `Authorization: Bearer <access_token>` header. The mobile client (`lib/supabase/mobile.ts`) handles token extraction and Supabase session resolution.

### Base URL

```
Production: https://the-right-wire.com/api/v1
```

### Authentication

Most endpoints that modify data require authentication.

**Login Flow:**
1. `POST /auth/login` with `{ email, password }` → receive `{ session: { access_token, refresh_token } }`
2. Include `access_token` in the `Authorization: Bearer <token>` header for all subsequent requests
3. When token expires, call `POST /auth/refresh` with the `refresh_token`

**Password Recovery Flow:**
1. `POST /auth/forgot-password` with `{ email }` → sends reset email
2. User clicks link in email → deep link with `access_token` + `refresh_token`
3. `POST /auth/reset-password` with `{ access_token, refresh_token, new_password }`

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
| 403 | Forbidden (not authorized for this action or plan-gated) |
| 404 | Resource not found |
| 422 | Unprocessable (e.g., email already taken) |
| 429 | Rate limited (WIRE AI endpoints) |
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

### POST `/auth/forgot-password`

Request a password reset email.

**Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Notes:**
- Always returns 200 regardless of whether the email exists (prevents email enumeration)

---

### POST `/auth/reset-password`

Set a new password using tokens from the reset email.

**Body:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "abc...",
  "new_password": "newSecurePassword"
}
```

**Success Response (200):**
```json
{
  "message": "Password updated successfully."
}
```

**Notes:**
- `new_password` must be at least 8 characters
- Tokens come from the password reset email link

---

### POST `/auth/change-password` 🔒

Change password while logged in. **Requires authentication.**

**Body:**
```json
{
  "current_password": "oldPassword",
  "new_password": "newSecurePassword"
}
```

**Success Response (200):**
```json
{
  "message": "Password changed successfully."
}
```

**Notes:**
- Verifies current password by attempting sign-in before allowing the change
- `new_password` must be at least 8 characters

---

### POST `/auth/delete-account` 🔒

Permanently delete your account. **Requires authentication.**

**Body:**
```json
{
  "confirmation": "DELETE"
}
```

**Success Response (200):**
```json
{
  "message": "Account deleted successfully."
}
```

**Notes:**
- Requires exact string `"DELETE"` as confirmation
- Permanently deletes the user via Auth Admin API — this cannot be undone

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
| `source` | string | — | Filter by source type: `x`, `rss`, `youtube`, `user`, `wire` |
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
  "parent_id": "uuid"
}
```

**Success Response (201):**
```json
{
  "comment": { ... }
}
```

**Notes:**
- `parent_id` is optional — for threaded replies
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

### DELETE `/forums/:slug/threads/:threadId` 🔒

Delete your own thread. **Requires authentication.**

**Success Response (200):**
```json
{
  "success": true
}
```

**Notes:**
- Verifies forum exists by slug and thread belongs to forum
- Returns 403 if you don't own the thread

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

## Bookmarks

### GET `/bookmarks` 🔒

Get your saved posts. **Requires authentication.**

**Query Parameters:** `?limit=20&offset=0`

**Success Response (200):**
```json
{
  "bookmarks": [
    {
      "id": "uuid",
      "post_id": "uuid",
      "created_at": "...",
      "post": {
        "id": "uuid",
        "content": "...",
        "source": "x",
        "category": "Politics",
        "upvote_count": 42,
        "comment_count": 7,
        "created_at": "..."
      }
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

**Notes:**
- Joins with `posts` table to include full post data

---

### POST `/bookmarks` 🔒

Bookmark a post. **Requires authentication.**

**Body:**
```json
{
  "post_id": "uuid"
}
```

**Success Response (201):**
```json
{
  "bookmark": { "id": "uuid", "post_id": "uuid", "created_at": "..." }
}
```

**Notes:**
- Idempotent via upsert on `user_id,post_id`
- Verifies post exists before bookmarking

---

### DELETE `/bookmarks/:id` 🔒

Remove a bookmark. **Requires authentication.**

**Success Response (200):**
```json
{
  "success": true
}
```

---

### POST `/bookmarks/check` 🔒

Batch check which posts are bookmarked. **Requires authentication.**

**Body:**
```json
{
  "post_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Success Response (200):**
```json
{
  "bookmarked": {
    "uuid1": true,
    "uuid3": true
  }
}
```

**Notes:**
- Max 100 IDs per request
- Missing keys = not bookmarked

---

## Notifications

### GET `/notifications` 🔒

Get your notification inbox. **Requires authentication.**

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 20 | Results per page (1-100) |
| `offset` | number | 0 | Pagination offset |
| `unread_only` | string | — | Set to `"true"` to filter unread only |

**Success Response (200):**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "comment_reply",
      "title": "New reply to your comment",
      "body": "patriot1776 replied...",
      "data": { "post_id": "uuid" },
      "is_read": false,
      "created_at": "..."
    }
  ],
  "total": 50,
  "unread_count": 8
}
```

---

### POST `/notifications` 🔒

Mark notifications as read. **Requires authentication.**

**Body:**
```json
{
  "notification_ids": ["uuid1", "uuid2"]
}
```

Or mark all as read:
```json
{
  "mark_all_read": true
}
```

**Success Response (200):**
```json
{
  "updated": 2
}
```

---

### DELETE `/notifications/:id` 🔒

Delete a single notification. **Requires authentication.**

**Success Response (200):**
```json
{
  "success": true
}
```

---

### GET `/notifications/preferences` 🔒

Get push notification settings. **Requires authentication.**

**Success Response (200):**
```json
{
  "breaking_alerts": true,
  "wire_posts": true,
  "comment_replies": true,
  "new_followers": true,
  "daily_digest": false
}
```

**Notes:** Returns defaults if no preferences row exists.

---

### PUT `/notifications/preferences` 🔒

Update push notification settings. **Requires authentication.**

**Body (all fields optional, must be booleans):**
```json
{
  "breaking_alerts": true,
  "wire_posts": false,
  "comment_replies": true,
  "new_followers": true,
  "daily_digest": false
}
```

**Success Response (200):**
```json
{
  "preferences": { ... }
}
```

---

## Push Notifications (Device Tokens)

### POST `/devices` 🔒

Register a push notification token. **Requires authentication.**

**Body:**
```json
{
  "token": "fcm_or_apns_token_string",
  "platform": "ios" | "android",
  "app_version": "1.0.0"
}
```

**Success Response (200):**
```json
{
  "device": { "id": "uuid", "token": "...", "platform": "ios", "app_version": "1.0.0" }
}
```

**Notes:**
- `app_version` is optional
- Upserts on `token` (unique constraint)

---

### DELETE `/devices` 🔒

Unregister a push notification token. **Requires authentication.**

**Body:**
```json
{
  "token": "fcm_or_apns_token_string"
}
```

**Success Response (200):**
```json
{
  "success": true
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
    "cancel_at_period_end": false,
    "source": "stripe"
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

## Payments (Mobile)

### POST `/checkout` 🔒

Create a Stripe Checkout session for subscribing. **Requires authentication.**

**Body:**
```json
{
  "plan": "pro" | "intelligence",
  "billingPeriod": "monthly" | "yearly",
  "success_url": "yourapp://checkout-success",
  "cancel_url": "yourapp://checkout-cancel"
}
```

**Success Response (200):**
```json
{
  "url": "https://checkout.stripe.com/c/pay/..."
}
```

**Notes:**
- `billingPeriod` is optional for Pro (defaults to monthly), ignored for Intelligence
- `success_url` and `cancel_url` are optional — support mobile deep links
- Server resolves Stripe Price IDs (client never sends price IDs)
- Sets `metadata.source = "mobile"`

---

### POST `/portal` 🔒

Create a Stripe Customer Portal session. **Requires authentication.**

**Body:**
```json
{
  "return_url": "yourapp://profile"
}
```

**Success Response (200):**
```json
{
  "url": "https://billing.stripe.com/p/session/..."
}
```

**Notes:**
- `return_url` is optional — supports mobile deep links
- Returns 400 if user has no Stripe customer record

---

### POST `/donate` 🔒

Create a one-time donation/tip session. **Requires authentication.**

**Body:**
```json
{
  "amount": 500,
  "success_url": "yourapp://donate-thanks",
  "cancel_url": "yourapp://donate-cancel"
}
```

**Success Response (200):**
```json
{
  "url": "https://checkout.stripe.com/c/pay/..."
}
```

**Notes:**
- `amount` is in cents ($1 = 100, max $500 = 50000)
- `success_url` and `cancel_url` are optional — support mobile deep links
- One-time payment mode (not recurring)

---

## In-App Purchases (IAP)

### POST `/iap/validate` 🔒

Validate an Apple/Google purchase receipt. **Requires authentication.**

**Body:**
```json
{
  "platform": "ios" | "android",
  "product_id": "com.therightwire.pro.monthly",
  "transaction_id": "1000000123456789",
  "receipt_data": "base64_encoded_receipt..."
}
```

**Success Response (200):**
```json
{
  "subscription": {
    "plan": "pro",
    "status": "active",
    "current_period_end": "2026-03-20T...",
    "source": "iap_apple"
  }
}
```

**Notes:**
- `product_id` must contain "pro" or "intelligence" for plan detection
- Period detection: "yearly" in `product_id` = 365 days, otherwise 30 days
- Source is `"iap_apple"` or `"iap_google"` based on platform
- Upserts both `iap_receipts` and `subscriptions` tables
- **TODO:** Server-side Apple/Google receipt validation not yet implemented (trusts client receipts as-is)

---

### POST `/iap/restore` 🔒

Restore previous IAP purchases. **Requires authentication.**

**Body:**
```json
{
  "receipts": [
    {
      "platform": "ios",
      "product_id": "com.therightwire.pro.monthly",
      "transaction_id": "1000000123456789",
      "receipt_data": "base64..."
    }
  ]
}
```

**Success Response (200):**
```json
{
  "restored": [
    { "plan": "pro", "status": "active", "expires_at": "2026-03-20T..." }
  ]
}
```

**Notes:**
- Max 50 receipts per request
- Skips expired receipts
- Re-activates valid subscriptions

---

## Content Moderation

### POST `/reports` 🔒

Report content for moderation. **Requires authentication.**

**Body:**
```json
{
  "target_type": "post" | "comment" | "user" | "thread",
  "target_id": "uuid",
  "reason": "Spam or misleading content",
  "details": "Optional additional context"
}
```

**Success Response (201):**
```json
{
  "report": {
    "id": "uuid",
    "target_type": "post",
    "target_id": "uuid",
    "reason": "Spam or misleading content",
    "status": "pending",
    "created_at": "..."
  }
}
```

**Notes:**
- Required for App Store compliance
- `details` is optional
- Status starts as `"pending"`

---

### GET `/blocked-users` 🔒

List your blocked users. **Requires authentication.**

**Success Response (200):**
```json
{
  "blocked": [
    {
      "id": "uuid",
      "blocked_id": "uuid",
      "username": "troll123",
      "avatar_url": "https://...",
      "created_at": "..."
    }
  ]
}
```

---

### POST `/blocked-users` 🔒

Block a user. **Requires authentication.**

**Body:**
```json
{
  "user_id": "uuid-to-block"
}
```

**Success Response (201):**
```json
{
  "blocked_user": { "id": "uuid", "blocker_id": "uuid", "blocked_id": "uuid", "created_at": "..." }
}
```

**Notes:**
- Self-blocking returns 400
- Idempotent via upsert

---

### DELETE `/blocked-users` 🔒

Unblock a user. **Requires authentication.**

**Body:**
```json
{
  "user_id": "uuid-to-unblock"
}
```

**Success Response (200):**
```json
{
  "success": true
}
```

---

## Uploads

### POST `/uploads/avatar` 🔒

Upload a new avatar image. **Requires authentication.**

**Request:** `multipart/form-data` with field `avatar`

**Constraints:**
- File types: JPEG, PNG, WebP, GIF
- Max size: 2MB

**Success Response (200):**
```json
{
  "avatar_url": "https://...supabase.co/storage/v1/object/public/user-uploads/avatars/...",
  "message": "Avatar updated successfully"
}
```

**Notes:**
- Uploads to Supabase Storage bucket `user-uploads`
- Automatically updates `profiles.avatar_url`

---

## Search

### GET `/search`

Search across posts, users, or forums.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | *required* | Search query |
| `type` | string | `posts` | `posts`, `users`, or `forums` |
| `limit` | number | 20 | Results per page (1-100) |
| `offset` | number | 0 | Pagination offset |

**Success Response (200):**
```json
{
  "results": [ ... ],
  "total": 42,
  "type": "posts",
  "limit": 20,
  "offset": 0
}
```

**Notes:**
- Posts: searches `content` field (case-insensitive)
- Users: searches `username` and `display_name`
- Forums: searches `name` and `description`

---

## WIRE AI

### POST `/wire/ask` 🔒

Ask WIRE AI a question about a post. **Requires authentication.**

**Body:**
```json
{
  "post_id": "uuid",
  "question": "What's the real story here?",
  "parent_comment_id": "uuid"
}
```

**Success Response (200):**
```json
{
  "comment": { ... },
  "mode": "commentator" | "facts"
}
```

**Notes:**
- `parent_comment_id` is optional (for threaded replies)
- `question` max 500 characters
- **Rate limits (daily):** Free: 3, Pro: 10, Intelligence: 25 (configurable via `wire_config`)
- **Site-wide daily cap:** 500 (configurable)
- **Mode detection:** Auto-detects "facts mode" from keywords ("fact check", "is it true", etc.)
- **Models:** Haiku for commentary, Sonnet for facts
- Returns 403 if `wire_enabled` feature flag is off
- Returns 429 if rate limited

---

### GET `/wire/quota` 🔒

Check your remaining WIRE AI usage for today. **Requires authentication.**

**Success Response (200):**
```json
{
  "quota": {
    "limit": 10,
    "used": 3,
    "remaining": 7,
    "plan": "pro"
  }
}
```

---

## Intelligence (Pro+ Only)

### GET `/intelligence/brief` 🔒🔒

Get today's intelligence brief. **Requires Intelligence plan.**

**Success Response (200):**
```json
{
  "brief": {
    "generated_at": "2026-02-20T...",
    "summary": {
      "total_stories": 20,
      "categories": { "Politics": 8, "Economy": 5, "Elections": 4, "Media Watch": 3 }
    },
    "top_stories": [
      {
        "id": "uuid",
        "content": "...",
        "category": "Politics",
        "upvote_count": 42,
        "comment_count": 7,
        "source": "x",
        "created_at": "..."
      }
    ]
  }
}
```

**Notes:**
- Returns JSON (not PDF) for mobile parsing
- Top 20 posts from last 24 hours sorted by upvotes
- Returns 403 for non-Intelligence users

---

### GET `/keyword-alerts` 🔒🔒

List your keyword alerts. **Requires Pro or Intelligence plan.**

**Success Response (200):**
```json
{
  "alerts": [
    {
      "id": "uuid",
      "keywords": ["trump", "executive order"],
      "is_active": true,
      "last_triggered_at": "...",
      "created_at": "..."
    }
  ]
}
```

---

### POST `/keyword-alerts` 🔒🔒

Create a keyword alert. **Requires Pro or Intelligence plan.**

**Body:**
```json
{
  "keywords": ["trump", "executive order"],
  "is_active": true
}
```

**Success Response (201):**
```json
{
  "alert": { ... }
}
```

**Notes:**
- Max 20 alerts per user
- `is_active` defaults to true

---

### PUT `/keyword-alerts` 🔒🔒

Update a keyword alert. **Requires Pro or Intelligence plan.**

**Body:**
```json
{
  "id": "uuid",
  "keywords": ["updated", "keywords"],
  "is_active": false
}
```

**Success Response (200):**
```json
{
  "alert": { ... }
}
```

---

### DELETE `/keyword-alerts` 🔒🔒

Delete a keyword alert. **Requires Pro or Intelligence plan.**

**Body:**
```json
{
  "id": "uuid"
}
```

**Success Response (200):**
```json
{
  "success": true
}
```

---

### GET `/trends` 🔒🔒

Get trend analytics. **Requires Intelligence plan.**

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `days` | number | 7 | Period in days (1-30) |

**Success Response (200):**
```json
{
  "trends": {
    "categories": [{ "name": "Politics", "count": 150 }],
    "top_sources": [{ "name": "RealDonaldTrump", "count": 45 }],
    "daily_volume": [{ "date": "2026-02-19", "count": 85 }],
    "period_days": 7
  }
}
```

---

## Analytics

### POST `/analytics` 🔒

Batch track analytics events. **Requires authentication.**

**Body:**
```json
{
  "events": [
    { "event_type": "post_viewed", "metadata": { "post_id": "uuid" } },
    { "event_type": "feed_scrolled", "metadata": { "depth": 20 } }
  ]
}
```

**Success Response (200):**
```json
{
  "inserted": 2
}
```

**Notes:**
- Max 50 events per batch
- `metadata` is optional per event
- Automatically injects `user_id` and `metadata.platform = "mobile"`

---

## App Management

### GET `/app/version`

Check for app updates and maintenance status.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `platform` | string | `ios` or `android` (required) |

**Success Response (200):**
```json
{
  "min_version": "1.0.0",
  "current_version": "1.0.0",
  "force_update": false,
  "maintenance_mode": false
}
```

**Notes:**
- No authentication required
- Reads from `app_config` table
- Use `min_version` + `force_update` to require app updates
- Use `maintenance_mode` to block the app during deployments

---

### GET `/health`

API health check. **No authentication required. No database call.**

**Success Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-02-20T06:29:16.427Z",
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
- GET `/search`
- GET `/app/version`
- GET `/health`
- POST `/auth/forgot-password`, `/auth/reset-password`

**Authenticated:**
- All POST, PATCH, PUT, DELETE endpoints (unless listed above)
- GET `/users/me`, `/subscription`, `/email-preferences`, `/referral`, `/votes/check`
- GET `/bookmarks`, `/notifications`, `/notifications/preferences`
- GET `/wire/quota`
- POST `/analytics`

**Plan-Gated (Pro+):**
- GET/POST/PUT/DELETE `/keyword-alerts` — Pro or Intelligence
- POST `/wire/ask` — rate limits vary by plan

**Plan-Gated (Intelligence only):**
- GET `/intelligence/brief`
- GET `/trends`

### Batch Operations

| Endpoint | Max Items |
|----------|-----------|
| GET `/votes/check` | 100 IDs |
| POST `/bookmarks/check` | 100 IDs |
| POST `/analytics` | 50 events |
| POST `/iap/restore` | 50 receipts |
