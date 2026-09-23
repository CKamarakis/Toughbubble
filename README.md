# ToughBubble

A personal workspace web app for notes and visual boards ("Storms").

> Status: Phase 2 — sign-in, the sidebar tree of projects, folders, notes, and Storms, project
> and folder pages, the note editor with autosave, and editor settings (element sizes and
> colors, saved colors). The Storm canvas comes next. See `openspec/changes/` for work in
> progress.

This repository uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for spec-driven
development: requirements are written as plain Markdown and reviewed *before* implementation
begins, so the specs — not the code — are the source of truth.

## Stack

Next.js 16 (App Router, TypeScript) · Supabase (Auth, Postgres) · Drizzle ORM · Tailwind CSS +
shadcn/ui · Vitest · deployed on Vercel.

## Layout

| Path | Purpose |
| --- | --- |
| `src/app/` | Pages and routes: `(auth)` sign-in/up pages, `(workspace)` signed-in pages, `auth/` email-link and sign-out routes |
| `src/proxy.ts` | Runs before every request: refreshes the session, redirects visitors without one (Next 16's name for middleware) |
| `src/db/` | Drizzle schema, `withUserDb()` (the only database entry point for app code), admin client |
| `src/lib/tree/` | Item tree: pure logic (order, search, destinations), database operations, Server Actions |
| `src/lib/notes/` | Note editor: shared Tiptap extensions, validation, saving, autosave logic |
| `src/lib/attachments/` | Note attachments: size and type rules, image scaling before upload, database and Storage operations, Server Actions |
| `src/lib/settings/` | Editor settings and saved colors: validation, database operations, Server Actions |
| `src/components/notes/` | Note editor, toolbar, link popover and link card, autosave hook; `attachments/` holds the image and file views, upload flow, and image menu |
| `src/components/color-picker.tsx` | Reusable color picker (saved colors first, presets, custom colors) |
| `src/components/workspace/` | Sidebar, tree, item page, contents list, Archive/Trash views, drag and drop |
| `src/lib/` | Auth actions, routing rules, Supabase clients |
| `drizzle/` | SQL migrations (generated, committed; applied by the Vercel build) |
| `scripts/` | `migrate-on-deploy.mjs`: runs migrations during Vercel builds |
| `tests/integration/` | Tests against the dev database (row-level security, Storage policies, integrity, cascades) |
| `openspec/specs/` | Current requirements, written as concrete scenarios |
| `openspec/changes/` | In-flight change proposals (proposal, design, tasks) |
| `openspec/changes/archive/` | Completed changes, organized by date |
| `openspec/config.yaml` | Project context and per-artifact rules given to AI assistants |
| `.claude/` | OpenSpec slash commands and skills for Claude Code |

## Setup

Requires [Node.js](https://nodejs.org/) 24+ and npm.

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** (the *dev* project; production gets its own — see
   [Environments](#environments)).

3. **Configure Supabase Auth** in the dashboard:
   - *Authentication → Sign In / Providers → Email*: email provider on, **Confirm email** on,
     minimum password length **8**, password requirements **lowercase, uppercase, digits and
     symbols** (keep in sync with `src/lib/auth/validation.ts`).
   - *Authentication → URL Configuration*: Site URL `http://localhost:3001`; Redirect URLs
     `http://localhost:3001/**`.
   - *Email templates*: leave the defaults. Editing them requires custom SMTP (see
     [Email](#email)).

4. **Create `.env.local`** from the template and fill in the values:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Where to find it |
   | --- | --- |
   | `APP_ENV` | `development` for local and preview; `production` only on Vercel production |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API: Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys: publishable key (`sb_publishable_…`) |
   | `SUPABASE_SECRET_KEY` | Project Settings → API Keys: secret key (`sb_secret_…`). Server-only; bypasses RLS |
   | `DATABASE_URL` | Connect → **Transaction pooler** (port 6543). Used by the app |
   | `DATABASE_ADMIN_URL` | Connect → **Session pooler** (port 5432). Used by migrations and tests only |

   Copy the pooler host exactly (it may be `aws-0-…` or `aws-1-…`). Use a database password of
   letters and digits, or URL-encode special characters. `.env.local` is gitignored.

5. **Apply the database migrations**

   ```bash
   npm run db:migrate
   ```

6. **Run the app** at <http://localhost:3001>

   ```bash
   npm run dev
   ```

   The dev server sends weaker cache headers than production, so the back button after
   sign-out can briefly show a cached page. Use `npm run build && npm start -- -p 3001` to check
   production behaviour.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3001 |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint (includes the rule that keeps app code off the admin database client) |
| `npm test` | Unit tests |
| `npm run test:integration` | Tests against the dev database. Creates and deletes throwaway users; refuses to run unless `APP_ENV=development` |
| `npm run db:generate` | Generate a migration from changes to `src/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations to the database in `DATABASE_ADMIN_URL` |

## Database access

App code reaches the database only through `withUserDb()` from `@/db/client`. It verifies the
session, then runs queries as that user with row-level security enforced, so a query without an
owner filter still only sees the user's own rows. The admin client (`@/db/admin`) bypasses RLS
and is blocked from `src/` by a lint rule; it is for migrations, tests, and background jobs.

## The item tree

- **One table, one tree.** Projects, folders, notes, and Storms are rows in `items`. Only projects
  and folders can contain items; the database enforces that, rejects cycles, and keeps active
  items under active parents (triggers in `drizzle/0003_tree_integrity_triggers.sql`, errors
  mapped to messages in `src/lib/tree/errors.ts`).
- **Order is computed, not stored.** The sidebar is always projects, folders, then notes and
  Storms, newest first; project and folder pages sort their contents by the viewer's choice.
  `position` is kept but unused.
- **`edited_at` is set explicitly** by edits (rename, restyle, convert, move) and drives the
  "Last edited" sort. Note content saves set it too (`saveNoteBody`); any new edit path must as well;
  archive, trash, and restore must not.
- **Archive and Trash** cascade to the whole subtree and record the item acted on in
  `status_root_id`, so restore brings back exactly what went together.
- **Drag and drop** only moves items into containers or to the top level; "Move to…" is the
  keyboard alternative.

## Notes

- **One extension list.** `src/lib/notes/extensions.ts` is used by the editor and by the server,
  which rebuilds each saved document against the same schema and rejects unknown content,
  unsafe links (only http, https, and mailto), out-of-range font sizes, and bodies over 800 KB.
- **Autosave** (`src/lib/notes/autosave.ts`, a pure reducer, plus `use-note-autosave.ts`) saves
  one second after typing stops, on leaving the note, and retries with backoff. The toolbar
  shows the status; closing the tab with unsaved work asks first.
- **Links** open in a new tab on a plain click (a drag that selects text doesn't). Hovering a
  link, or moving the cursor into it, shows a card with its address and Open, Edit, and Remove
  (`src/components/notes/link-card.tsx`); Tab moves from the link into the card.
- **Versioned saves.** Each body has a `version`. A save based on an older version is refused,
  and the editor offers *Load latest* or *Keep mine*. Returning to a tab quietly loads a newer
  version when nothing is unsaved.
- **Editor settings** live in `user_settings` (one row per user): per-element font size and
  color for paragraphs and headings 1–6, applied as CSS variables, and the saved custom colors
  shown first in every color picker. Removing a saved color doesn't change text already using it.

## Attachments

- **Files live in Supabase Storage**, in the private `attachments` bucket at
  `<owner_id>/<note_id>/<attachment_id>`, with a row per file in `attachments`. The bucket and
  its owner-only policies (read, upload, delete; no replacing) are created by
  `drizzle/0006_attachments_storage.sql`. The bucket enforces the 5 MB limit.
- **The browser uploads directly** with the user's own session, so Storage RLS applies; files
  never pass through Server Actions (1 MB limit). A row starts `pending` and becomes `ready`
  once the file is in Storage. No secret key is used in app code.
- **Bodies store ids, not URLs.** Image and file nodes carry an `attachmentId`; the editor asks
  for signed links (1 hour) and refreshes them. A save that names another note's file is
  rejected. Pasted web images (plain `<img src>`) are dropped.
- **Images are scaled in the browser** before upload (`src/lib/attachments/prepare-image.ts`):
  PNG, JPEG, and WebP over 2560 px on the longer side are scaled to 2560 px and re-encoded (WebP
  where the browser supports it); the smaller of the original and the result is stored. GIFs are
  stored as they are. PNG, JPEG, GIF, and WebP show inline; everything else (SVG included) is a
  file card.
- **Deleting files.** Removing a file from the text keeps it (Undo works). *Delete forever*
  removes the stored files after the rows are gone; a failed removal is logged and left for the
  purge job. Pasting a file from another note copies it into the target note.
- **Not handled yet:** unused files and unfinished uploads are only cleaned up by the later
  purge job, and there is no account deletion. Whoever adds account deletion must also remove
  the user's `attachments/<owner_id>/` folder: deleting the auth user does not remove files.

## Environments

```
localhost:3001  ---------------->  Supabase DEV
branch push  -->  Vercel preview  -->  Supabase DEV
main merge   -->  Vercel prod     -->  Supabase PROD
```

- Each Supabase project needs the auth settings from step 3, with its own Site URL and redirect
  allowlist (dev: `http://localhost:3001/**` plus the Vercel preview wildcard; prod: the
  production domain).
- Vercel environment variables mirror `.env.local`: preview uses the dev project's values with
  `APP_ENV=development`; production uses the prod project's values with `APP_ENV=production`.
- **Migrations run during the Vercel build** (`scripts/migrate-on-deploy.mjs`, called by
  `npm run build`), before the new version goes live: a branch push migrates the dev project,
  a merge to `main` the prod project. This needs `DATABASE_ADMIN_URL` (the session pooler URL,
  port 5432) in Vercel for Preview (dev project) and Production (prod project); without it the
  build fails and the current version stays live. Local builds never migrate; run
  `npm run db:migrate` for your local database.
- Migrations must stay additive (new tables, columns, policies): the old version keeps serving
  while the new one builds, so it must keep working against the migrated schema.

## Email

Supabase's built-in email sender is for testing: it only delivers to your Supabase team's
addresses, allows about 2 emails per hour, and locks the email templates. With it, confirmation
and reset links return to `/auth/callback` and only work in the browser where the sign-up or
reset was started.

Before inviting other people, configure custom SMTP (*Authentication → Emails → SMTP
Settings*). Then switch both templates to links that work in any browser, and point
`emailLinkTarget()` in `src/lib/auth/actions.ts` at the origin:

- **Confirm signup:** `{{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
- **Reset password:** `{{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

## Workflow

Run these from Claude Code inside this repo:

| Command | What it does |
| --- | --- |
| `/opsx:explore` | Think through options before committing to an approach |
| `/opsx:propose <idea>` | Draft a change proposal with specs and design |
| `/opsx:apply` | Implement the tasks from an approved proposal |
| `/opsx:archive` | Move a completed change into the archive |
| `/opsx:update` | Revise an existing in-flight change |
| `/opsx:sync` | Reconcile specs with what was actually built |

The intended loop is **explore → propose → review → apply → archive**, with a human reading the
generated specs before implementation starts. The OpenSpec CLI is installed with
`npm install -g @fission-ai/openspec@latest`.
