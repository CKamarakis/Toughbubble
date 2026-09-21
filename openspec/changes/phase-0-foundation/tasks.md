# Tasks

## 1. Scaffold

- [x] 1.1 Create the Next.js app in the repo root (TypeScript, App Router, Tailwind, ESLint, `src/`, `@/*` alias, npm) without overwriting README.md or `.gitignore`; verify `npm run dev` serves the default page on localhost:3001
- [x] 1.2 Add `.next/`, `.vercel/`, `next-env.d.ts`, and `coverage/` to `.gitignore`; verify `git status` shows no build output after `npm run build`
- [x] 1.3 Initialize shadcn/ui with CSS-variable theming and add the Button component; verify a Button renders on the placeholder page
- [x] 1.4 Add Vitest with a trivial passing test and `npm test` script; verify `npm test` passes
- [x] 1.5 Add `.env.example` listing every required variable (Supabase URL, publishable/anon key, pooler database URL, admin database URL, site URL) with comments; verify no real secrets are committed

## 2. Theme

- [x] 2.1 Define the warm neutral scale and brand accents as CSS variables and map them to shadcn tokens for `:root` (light) and `.dark` per D7; verify light and dark token values match the palette in the project context
- [x] 2.2 Add `next-themes` provider (class attribute, system default) in the root layout; verify with DevTools color-scheme emulation that the app follows the OS setting and switches live
- [x] 2.3 Build a Light / Dark / System theme control; verify the choice applies immediately and survives reload with no flash of the other theme
- [x] 2.4 Add a unit test computing contrast for body and secondary text pairs in both themes; verify every pair is at least 4.5:1

## 3. Supabase setup (dev)

- [x] 3.1 Create the Supabase dev project and record its URL, keys, pooler and direct database URLs in `.env.local`; verify a connection with `psql` or a one-off script
- [x] 3.2 Configure dev email auth: "Confirm email" on, minimum password length 8, required characters lowercase/uppercase/digit/symbol, Site URL `http://localhost:3001`, redirect allowlist `http://localhost:3001/**`; keep the default email templates (editing them needs custom SMTP, see D2); verify the settings in the dashboard and via the Supabase auth settings endpoint

## 4. Database schema and access layer

- [x] 4.1 Add Drizzle, drizzle-kit, and postgres.js with `db:generate` and `db:migrate` scripts; verify `npm run db:generate` runs against an empty schema
- [x] 4.2 Define `item_kind` and `item_status` enums and the `items` table per D4 (composite unique and self FK, `position` with `COLLATE "C"`, defaults, indexes); verify the generated SQL contains the composite FK, collation, and all three indexes
- [x] 4.3 Define the `item_content` table per D4 (composite FK to items, `version` default 1, cascade delete); verify the generated SQL matches
- [x] 4.4 Add the `updated_at` trigger for both tables in a migration; verify an update changes `updated_at`
- [x] 4.5 Define RLS policies for both tables per D5 and enable RLS; verify in the Supabase dashboard that both tables show RLS enabled with the expected policies after migrating dev
- [x] 4.6 Implement `withUserDb(fn)` in `src/db/client.ts` (with `runAsUser` in `rls.ts` and the admin client in `admin.ts`) (verified claims, `set_config`, `SET LOCAL ROLE authenticated`, transaction, `prepare: false`); verify a query inside `withUserDb` sees `auth.uid()` equal to the signed-in user's id
- [x] 4.7 Add a `no-restricted-imports` lint rule blocking the admin client from `src/app/`; verify `npm run lint` fails on a deliberate bad import, then remove it
- [x] 4.8 Install `fractional-indexing`; verify it imports and generates keys in a unit test

## 5. Authentication

- [x] 5.1 Add `@supabase/ssr` server and browser clients in `src/lib/supabase/`; verify both typecheck with `npm run build`
- [x] 5.2 Build the sign-in page (email + password form, errors for wrong credentials, unconfirmed email with resend, and invalid links) as a Server Action; verify sign-in of a confirmed test account reaches the workspace
- [x] 5.3 Implement `/auth/callback` (code exchange, same-origin `next` sanitizing, error redirect); add unit tests for `next` sanitizing (relative path kept, absolute/protocol-relative URLs rejected); verify tests pass
- [x] 5.4 Implement `src/proxy.ts` (Next 16 rename of `middleware.ts`) session refresh and redirects (no session -> `/sign-in?next=...`, session on sign-in/sign-up/forgot-password -> `/`); unit-test the routing decision; verify tests pass
- [x] 5.5 Build the protected workspace layout and empty-workspace placeholder with the account email, sign-out, and theme control; set `Cache-Control: no-store`; verify sign-in -> empty workspace -> sign-out -> back button returns to sign-in on localhost
- [ ] 5.6 Verify manually on localhost with a real inbox: sign-up sends a confirmation email and its link signs you in; sign-in before confirming is refused with a resend option; forgot-password link lets you set a new password; an expired/used link shows an error; deep link while signed out returns to that link after sign-in; reload and browser restart keep the session
- [ ] 5.7 Build the sign-up page (email, password meeting the rules (8+ characters with lowercase, uppercase, digit, symbol), neutral "check your email" result for new and existing emails); verify with a unit test for the password rule and a sign-up of a new address
- [x] 5.8 Implement `/auth/confirm` (`verifyOtp` with `token_hash` for `email` and `recovery` types, same-origin `next`, error redirect to sign-in) for use once custom SMTP allows `token_hash` templates, and point email links at `/auth/callback` meanwhile; verify an invalid token redirects to sign-in with the error message
- [ ] 5.9 Build forgot-password (neutral result) and `/reset-password` (session required, new password meeting the same rules, then workspace); verify an unknown email shows the same message as a known one

## 6. Data isolation tests

- [x] 6.1 Build the integration test harness: env guard refusing the prod database, admin-API creation and cleanup of two test users, helper to run code through `withUserDb` as each user; verify it creates and removes users cleanly
- [x] 6.2 Test ownership and isolation: owner default, owner spoofing rejected, cross-owner read/update/delete affects nothing, unfiltered list returns only own rows, no-session request returns nothing; verify all pass
- [x] 6.3 Test integrity: invalid kind/status rejected, default `active`, cross-owner parent rejected, cross-owner content rejected, second content row rejected, `version` starts at 1; verify all pass
- [x] 6.4 Test cascades: deleting a folder removes child note and its content; deleting a test user removes all their rows; `position` sorts in byte order (e.g. `"Z"` before `"a"`); verify all pass

## 7. Deploy

- [ ] 7.1 Create the Vercel project from the GitHub repo; set preview env vars to the dev Supabase project; add the Vercel preview wildcard to the dev redirect allowlist; verify a branch push produces a preview where sign-in works
- [x] 7.2 Create the Supabase prod project with the same email auth settings and templates as 3.2 (Site URL and allowlist set to the production domain), apply migrations, and set production env vars in Vercel; verify migrations applied and RLS enabled in the prod project
- [ ] 7.3 Deploy `main` to production; verify sign-up with confirmation, sign-in, empty workspace, theme toggle, and sign-out on the production URL
- [x] 7.4 Update README with setup steps (env vars, `db:migrate`, test commands, environments); verify a fresh clone can follow it to a running localhost app
