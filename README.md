# Toughbubble

A personal workspace web app for notes and visual boards ("Storms").

> Status: Phase 0 (foundation) — sign-in, database schema with row-level security, light/dark
> theme, and an empty workspace. See `openspec/changes/` for work in progress.

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
| `src/lib/` | Auth actions, routing rules, Supabase clients |
| `drizzle/` | SQL migrations (generated, committed) |
| `tests/integration/` | Tests against the dev database (row-level security, integrity, cascades) |
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
- Migrations are applied by hand, dev first, then prod: set `DATABASE_ADMIN_URL` to the target
  project and run `npm run db:migrate`. They are not run during the Vercel build.

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
