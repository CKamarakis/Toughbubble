# Proposal

## Why

ToughBubble has no code yet. Every later phase (tree, notes, attachments, Storms) needs the same base: a deployed Next.js app, sign-in, and a Postgres schema where each user's data is isolated by the database itself. The schema decisions made now (ownership, cascade markers, ordering keys, content storage) are expensive to change once data exists, so they are settled in this phase.

## What Changes

- Scaffold the Next.js (App Router, TypeScript) app with Tailwind CSS and shadcn/ui, wired to the brand palette and warm neutral scale.
- Light and dark themes: follow the OS preference by default, with a manual toggle that persists.
- Email + password accounts through Supabase Auth: open sign-up with email confirmation, sign-in, sign-out, and "forgot password" reset by email. Every app route except the auth pages requires a session. (Google sign-in was the original plan; it is deferred to a later change.)
- A signed-in user lands on an empty workspace shell (placeholder main pane; the real sidebar tree is Phase 1).
- Database schema via Drizzle migrations:
  - `items`: one tree for projects, folders, notes, and Storms, with owner, parent, kind, title, fractional `position` key, status (`active | archived | trashed`), `status_root_id` cascade marker, status timestamp, and project metadata (icon, color, project status).
  - `item_content`: one row per note or Storm holding the body as JSON plus a `version` counter for conflict detection.
- Row-level security on every table. Request-path queries run as the signed-in user (verified JWT claims + `authenticated` role in a transaction), so RLS is enforced, not merely a backstop.
- Database-level integrity: an item's parent and content must belong to the same owner; deleting an item deletes its content and descendants.
- Vercel deployment from GitHub: preview deployments per branch, production from `main`, separate dev and prod Supabase projects.

## Capabilities

### New Capabilities

- `user-auth`: email + password sign-up (with confirmation), sign-in, sign-out, password reset, session persistence, and protection of app routes.
- `workspace-data`: ownership and isolation of workspace data, plus data-integrity rules for the item tree and item content.
- `app-theme`: light/dark theme selection and persistence.

### Modified Capabilities

None (no existing specs).

## Impact

- **New code**: entire Next.js app (`src/`), Drizzle schema and SQL migrations, Supabase auth helpers, `proxy.ts` (Next 16 name for middleware).
- **New dependencies**: `next`, `react`, `@supabase/ssr`, `@supabase/supabase-js`, `drizzle-orm`, `drizzle-kit`, `postgres`, `fractional-indexing` (installed now, used in Phase 1), `next-themes`, Tailwind CSS, shadcn/ui, Vitest.
- **External systems**: two Supabase projects (dev, prod) with email auth settings and email templates configured, a Vercel project linked to `github.com/CKamarakis/ToughBubble`.
- **Secrets**: Supabase URL/keys and database URLs in `.env.local` (gitignored) and Vercel environment variables; `.env.example` documents them.
- **Not in this phase**: Google sign-in (deferred), sidebar tree and item CRUD UI (Phase 1), editor and autosave (Phase 2), attachments/Storage (Phase 3), 30-day purge job (later phase).
