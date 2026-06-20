# Shelfmark

Shelfmark is a real login-based bookmarking product for product teams. It lets users save links into collections, tag them, search the library, favorite important references, and archive stale items.

## Stack

- React, TypeScript, Vite, Tailwind CSS
- Clerk for authentication
- Supabase Postgres with row-level security
- Novus/Pendo Web SDK for product analytics
- Vercel for deployment

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Required environment variables:

```text
VITE_CLERK_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_NOVUS_PENDO_API_KEY=
```

In Clerk, configure the Supabase JWT template so `getToken({ template: "supabase" })` returns a JWT whose `sub` claim is the Clerk user ID.

In Supabase, run:

```sql
\i supabase/schema.sql
```

The RLS policies require `auth.jwt() ->> 'sub'` to match `clerk_user_id`.

## Analytics Events

Shelfmark initializes the Novus/Pendo Web SDK when `VITE_NOVUS_PENDO_API_KEY` is present and tracks:

- `login_completed`
- `bookmark_created`
- `bookmark_favorited`
- `bookmark_archived`
- `collection_selected`
- `tag_filter_applied`
- `search_submitted`

## Verification

```bash
npm test
npm run build
npm run lint
```
