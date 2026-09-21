# Design

## Context

Greenfield repo: only OpenSpec files, README, and `.gitignore` exist. See proposal.md for motivation and scope.

Local environment observed: Node 24, npm 11, no pnpm, no Docker. That rules out running Supabase locally via its CLI/Docker stack without extra setup, so development targets a hosted Supabase project.

Decisions already made during exploration (recorded here, rationale below): request queries run as the signed-in user; archive/trash status is written to every descendant with a `status_root_id` marker; items restored under a still-trashed/archived parent go to root level; sibling order uses fractional text keys; note/Storm bodies live in a separate `item_content` table with a `version` column.

## Goals / Non-Goals

**Goals:**
- A schema that Phases 1-6 can build on without reshaping core columns.
- RLS that is actually exercised on every request path, and a test proving it.
- A repeatable deploy: push a branch -> preview; merge to `main` -> production.

**Non-Goals:**
- A `profiles` table. The workspace header shows the account email; add a table only when a user-editable profile field (name, avatar) appears.
- Implementing cascade archive/trash, restore, move, or reorder logic (Phase 1). This phase only provides the columns and indexes.
- Implementing optimistic-concurrency saves (Phase 2). This phase only provides the `version` column.
- Storage buckets and policies (Phase 3).
- The 30-day purge job (later phase; see Open Questions).

## Decisions

### D1. Project layout and tooling
- `create-next-app` with TypeScript, App Router, Tailwind, ESLint, `src/` directory, `@/*` alias. npm as the package manager (already installed).
- shadcn/ui initialized with CSS-variable theming.
- Vitest for unit and integration tests.
- Layout:
  ```
  src/
    app/
      (auth)/sign-in, sign-up, forgot-password   <- public auth pages
      (auth)/actions.ts           <- Server Actions calling Supabase Auth
      auth/confirm/route.ts       <- email links (token_hash)
      auth/callback/route.ts      <- email links (PKCE code fallback)
      auth/sign-out/route.ts
      (workspace)/layout.tsx      <- requires session, renders shell
      (workspace)/page.tsx        <- empty workspace placeholder
      (workspace)/reset-password  <- set new password (needs session)
    db/
      schema.ts                   <- Drizzle tables, enums, RLS policies
      client.ts                   <- withUserDb() (the only app entry point)
      rls.ts                      <- runAsUser(); not importable from app code
      admin.ts                    <- RLS-bypassing client; not importable from app code
    lib/supabase/
      server.ts, client.ts
    proxy.ts                      <- Next 16 name for middleware.ts
  drizzle/                        <- generated SQL migrations (committed)
  ```
- Alternative considered: pnpm. Rejected for now; it would add a global install step with no need specific to this project.

### D2. Auth: Supabase Auth with `@supabase/ssr`, cookie sessions
- Email + password only (Google deferred). Sign-up, sign-in, resend-confirmation, reset-request, and set-new-password are Server Actions, so auth cookies are set server-side and forms work before hydration.
- Supabase project settings carry the rules: "Confirm email" on, minimum password length 8, and required characters (lowercase, uppercase, digit, symbol) in both projects. The app checks the same rules first so it can name what is missing; `src/lib/auth/validation.ts` must stay in sync with the Supabase setting.
- Auth errors without a specific message are logged server-side (code, status, message; never the password) so they appear in Vercel logs.
- **Email links (now): Supabase's default templates + PKCE code.** Supabase does not allow editing email templates while the project uses its built-in email sender. The default link goes through Supabase and returns to `<app>/auth/callback?code=...` (plus `next=/reset-password` for resets), where the code is exchanged for a session. Limitation: the link only works in the browser that started the flow.
  ```
  sign-up --> email --> Supabase verify --> /auth/callback?code          --> signed in --> /
  forgot  --> email --> Supabase verify --> /auth/callback?code&next=... --> signed in --> /reset-password
  ```
- **Email links (after custom SMTP): `token_hash` templates.** Custom SMTP unlocks the templates; they then link to `{{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` (or `type=recovery`), verified server-side with `verifyOtp`, which works in any browser. `/auth/confirm` is already built for this; switching needs the templates changed and `emailLinkTarget` in `src/lib/auth/actions.ts` pointed at the origin.
- No account enumeration: sign-up for an existing email and reset for an unknown email show the same message as success; wrong-password and unknown-email sign-ins show the same error.
- Redirects after sign-in go to `next` (only same-origin relative paths are accepted, to avoid an open redirect) or to `/`.
- `proxy.ts` refreshes the session cookie on every request and redirects: no user + protected path -> `/sign-in?next=...`; user + sign-in/sign-up/forgot-password -> `/`.
- Server code trusts only verified identity (`supabase.auth.getUser()` or `getClaims()`), never the unverified `getSession()` result.
- Workspace pages send `Cache-Control: no-store` so the back button after sign-out cannot show cached data.
- Alternatives considered: Auth.js (NextAuth) - rejected; Supabase Auth issues the JWT that Postgres RLS reads (`auth.uid()`), so one system covers both.

### D3. Database access: Drizzle, running as the user inside a transaction
Two connections, one purpose each:

```
request path                         admin path (never in request handlers)
------------                         ----------
withUserDb(fn)                       adminDb
  |  verify user (D2)                  - drizzle-kit migrations
  v                                    - integration test setup
  BEGIN                                - future purge job
  set_config('request.jwt.claims', <claims JSON>, true)
  SET LOCAL ROLE authenticated
  fn(tx)   <- all app queries; RLS applies
  COMMIT
```

- `withUserDb` is the only DB entry point exported to app code. `adminDb` lives in a module not imported from `src/app/`; a lint rule (`no-restricted-imports`) enforces it.
- Connection: `postgres` (postgres.js) to the Supabase transaction pooler (port 6543) with `prepare: false`, which the pooler requires. `set_config(..., true)` and `SET LOCAL` are transaction-scoped, so they are safe with a transaction pooler.
- Alternative considered: app-side `owner_id` filters with RLS as a backstop - rejected in exploration; one forgotten filter leaks data. Alternative: use `supabase-js` for all data access - rejected; loses Drizzle's typed queries and transactions, which Phase 1 moves need.
- Follows Drizzle's documented Supabase RLS pattern; exact helper names to be confirmed against current Drizzle docs during implementation.

### D4. Schema

```
auth.users (Supabase)
    | 1
    | on delete cascade
    | *
items                                         item_content
+-------------------------------------+       +-------------------------------+
| id              uuid pk             |  1  1 | item_id   uuid pk             |
| owner_id        uuid fk auth.users  |-------| owner_id  uuid                |
|                 default auth.uid()  |       | body      jsonb not null      |
| parent_id       uuid null           |       | version   int  not null def 1 |
| kind            item_kind enum      |       | created_at, updated_at        |
| title           text not null ''    |       +-------------------------------+
| position        text collate "C"    |       fk (item_id, owner_id)
| status          item_status enum    |          -> items(id, owner_id)
|                 default 'active'    |          on delete cascade
| status_root_id  uuid null           |
| status_changed_at timestamptz null  |
| icon, color     text null           |
| project_status  text null           |
| created_at, updated_at timestamptz  |
+-------------------------------------+
unique (id, owner_id)
fk (parent_id, owner_id) -> items(id, owner_id) on delete cascade
```

- **Same-owner parent via composite FK.** `unique (id, owner_id)` plus `fk (parent_id, owner_id)` makes the database reject a parent owned by someone else. With the default `MATCH SIMPLE`, a null `parent_id` skips the check, so root items work. Same pattern for `item_content`. Alternative: a trigger - rejected; FKs are declarative and cannot be bypassed.
- **`owner_id` default `auth.uid()`** and RLS `WITH CHECK (owner_id = auth.uid())` means app code never sets it, and cannot set it to someone else.
- **`position text COLLATE "C"`.** Fractional-indexing keys are compared by byte order; the database default collation (locale-aware) can order them differently. `"C"` collation makes `ORDER BY position` match the library.
- **`status_root_id`** is not a foreign key: the root item can be permanently deleted while descendants remain trashed; a dangling marker is harmless (restore-by-root finds nothing, individual restore still works).
- **`status_changed_at`** is what the 30-day purge will compare against.
- **Project metadata** (`icon`, `color`, `project_status`) are nullable columns on `items`, so converting folder -> project is an update of `kind` plus metadata, not a row move. `project_status` stays free text until its values are specified.
- **`item_content` keeps `item_id` as its primary key**, not `(item_id, owner_id)`. Inserting content for another user's item that already has content fails with a duplicate-key error instead of a foreign-key error, which in principle reveals that the item exists. Exploiting it requires knowing the item's random UUID (122 bits), so the risk is negligible; a single-column key keeps future tables that reference content simple.
- **Kind rules not enforced here**: whether notes/Storms may have children, and that only notes/Storms have content, are left to Phase 1/2 specs rather than guessed now.
- **Indexes**: `(owner_id, parent_id, position)` for sidebar children, `(owner_id, status)` for Archive/Trash views, `(status_root_id)` for cascade restore.
- **`updated_at`** maintained by a `BEFORE UPDATE` trigger so every write path gets it.

### D5. RLS policies
- RLS enabled on `items` and `item_content`; no policies for `anon`, so unauthenticated requests see nothing.
- For `authenticated`, per table: SELECT/UPDATE/DELETE `USING (owner_id = (select auth.uid()))`, INSERT/UPDATE `WITH CHECK (owner_id = (select auth.uid()))`. The `(select ...)` wrapper lets Postgres evaluate `auth.uid()` once per query instead of per row (Supabase's documented RLS performance advice).
- Policies are defined in the Drizzle schema so they are versioned in migrations with the tables.

### D6. Environments and deploy
```
branch push --> Vercel preview  --> Supabase DEV project
main merge  --> Vercel prod     --> Supabase PROD project
localhost:3001 -----------------> Supabase DEV project
```
- Two hosted Supabase projects (fits the free tier's two active projects). Migrations run against dev first, then prod.
- Each Supabase project's redirect allowlist holds that environment's app origins (dev: `http://localhost:3001/**` and the Vercel preview wildcard; prod: the production domain). Both projects get the same auth settings and email templates (D2).
- Migrations are applied manually (`npm run db:migrate` with the target env's admin URL) rather than in the Vercel build, so a failed build never half-applies a migration.
- Alternative considered: one Supabase project for everything - rejected; schema experiments would hit real data.

### D7. Theme
- `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`; it injects a pre-paint script, which meets the no-flash requirement.
- Brand palette and neutral scale as CSS variables mapped to shadcn tokens (`--background`, `--foreground`, `--muted-foreground`, `--border`, `--primary`, `--ring`, ...) for `:root` and `.dark`.
- Choice stored in `localStorage` (per browser), matching the spec. Syncing it to the account is not needed now.

### D8. Testing
- **Unit (Vitest):** redirect-target sanitizing for `next`, proxy routing decisions.
- **Integration (Vitest, dev project):** creates two throwaway users via the admin API, then through `withUserDb` asserts every `workspace-data` scenario: cross-owner read/update/delete, owner spoofing, unfiltered list, cross-owner parent and content, cascades, defaults. Runs against the dev database only; guarded by an env check that refuses the prod URL.
- **Manual:** sign-up, confirmation, sign-in, and reset round trips on localhost, a preview deployment, and production (they depend on real email delivery).

## Risks / Trade-offs

- [`adminDb` used by accident in a request handler bypasses RLS] -> lint restriction on imports from `src/app/`, and code review of any new import of the admin module.
- [Transaction pooler with prepared statements errors at runtime] -> `prepare: false` set in the client; integration tests run through the same pooler URL.
- [Integration tests touch the shared dev database] -> tests create and delete their own users; env guard blocks prod.
- [`COLLATE "C"` forgotten in a later migration that recreates the column] -> an integration test inserts keys whose locale and byte order differ and asserts byte-order sorting.
- [Every write updating all descendants for archive/trash is slow on huge subtrees] -> acceptable for a personal workspace; revisit only if a subtree reaches thousands of items.
- [Vercel preview URLs change per branch] -> wildcard entry in the dev project's redirect allowlist.
- [Supabase's built-in email sender only delivers to the project team's addresses, is rate-limited to a few emails per hour, and locks template editing] -> fine while only the owner uses the app; configure custom SMTP (then switch to `token_hash` templates) before inviting others.
- [Default-template email links only work in the browser that started sign-up or reset] -> accepted until custom SMTP; the error lands on sign-in with an "invalid or expired link" message.
- [Email templates edited in the dashboard (after custom SMTP) are not versioned in the repo] -> the exact template links are recorded in README setup steps.

## Migration Plan

1. Create the Supabase dev project, apply migrations, verify locally.
2. Create the Vercel project with preview env vars pointing at dev; verify a preview deploy.
3. Create the Supabase prod project, apply the same migrations, set production env vars, deploy `main`.
Rollback: no existing data or users, so rollback is redeploying the previous Vercel build; schema rollbacks are written as new forward migrations.

## Open Questions

- **Purge scheduler** (Vercel Cron vs `pg_cron`) and **Storage cleanup on purge**: needed by the phase that implements Trash purge; neither changes this phase's schema, since `status_changed_at` supports both.
- **Production domain**: a Vercel `*.vercel.app` URL works for now; a custom domain only adds one redirect-allowlist entry.
