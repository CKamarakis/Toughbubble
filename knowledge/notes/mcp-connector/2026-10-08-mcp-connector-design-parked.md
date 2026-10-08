---
title: "MCP connector: design (parked)"
date: 2026-10-08
tags:
  - mcp
  - parked
source: design.md
---

# Design

## Context

See proposal.md for the why. Facts from the codebase that shape the approach:

- `runAsUser(claims, fn)` in `src/db/rls.ts` runs a transaction with the role set to `authenticated` and `request.jwt.claims` set, so `auth.uid()` and every owner-only policy apply. Anything that can produce a verified `sub` gets per-user isolation for free.
- Tree and note logic lives in plain functions that take a transaction (`src/lib/tree/operations.ts`, `src/lib/notes/operations.ts`); Server Actions only wrap them. MCP tools can call the same functions, as the integration tests do.
- `saveNoteBody` rejects a save whose base version is stale (`src/lib/notes/operations.ts`) and replaces the whole body. The editor shows "Load latest / Keep mine" only when the open tab has unsaved changes; an idle tab takes a newer version number quietly (`src/lib/notes/autosave.ts`, `refreshed`). Rename, move and trash (`src/lib/tree/operations.ts`) have no version check.
- `withUserDb` (`src/db/client.ts`) is the only verified entry point and reads the cookie session; it does not see a bearer token. Attachment links use a cookie-based Storage client (`src/lib/attachments/actions.ts`).
- Note bodies are Tiptap JSON with custom attachment nodes (`src/lib/notes/attachment-nodes.ts`), font sizes, colors and alignment. Storms are not built yet.

```
Claude Code ----+
                +--HTTPS + OAuth bearer--> /api/mcp (Next route, Vercel)
claude.ai ------+                               |
(web/Desktop/mobile)                     verify Supabase JWT -> sub
                                                |
                                     (new bearer check, not withUserDb)
                                                |
                                     runAsUser({sub, ...}) --> existing operations --> Postgres (RLS)
                                                |
                                     Tiptap JSON <-> Markdown
```

## Goals / Non-Goals

**Goals:**
- One server and one sign-in flow for Claude Code and claude.ai.
- Read and write notes and the tree. Limits on what Claude may do are enforced by the token and the database, not only by which tools exist (see D8).

**Non-Goals:**
- Storms (not built yet).
- Uploading attachments through Claude (reading may return short-lived signed URLs).
- Permanent delete, emptying Trash, or settings changes through Claude.
- A local (stdio) server or a desktop extension.

## Decisions

### D1. Same repo, one route
The server is a Next.js route in this app. It reuses the schema, `runAsUser` and the operations layer. **Alternative:** a separate repo or service — it would have to copy the schema and the RLS setup and stay in sync with them.

### D2. OAuth 2.1 via Supabase, not personal API tokens
claude.ai custom connectors sign each user in through OAuth. A fixed request header is also possible but is in beta for a limited set of organizations and meant for one shared credential, not per-user sign-in. Supabase's OAuth 2.1 server issues standard Supabase JWTs (with `user_id`, `role`, `client_id`) and "existing Row Level Security policies automatically apply to OAuth tokens". **Alternative:** a personal-token table with a Settings UI — simpler, but works only in Claude Code and would be thrown away once claude.ai support is needed.

### D3. Client registration: dynamic client registration
Supabase supports dynamic client registration, which Claude's "Register automatically" option uses ("works with most servers"). Claude's recommended option, "Use Claude's published identity" (Client ID Metadata Document), needs server support; Supabase support for it was not found. Its caution applies: any MCP client can register, so the consent page must show which client is asking.

### D4. Consent page in the app
Supabase redirects to an authorization UI the app provides. The installed `@supabase/auth-js` 2.116.0 already has `auth.oauth.getAuthorizationDetails`, `approveAuthorization` and `denyAuthorization`.

### D5. MCP transport: `mcp-handler`
Vercel's `mcp-handler` turns an MCP server into a Next.js route handler (streamable HTTP) and has `withMcpAuth` for bearer tokens. Supabase's own `@supabase/server` (`withOAuthProtectedResource`, `withSupabase({ auth: 'user' })`) may cover the metadata and token checks instead; whether it fits a Next 16 route is unverified. Read the Next 16 route-handler docs in `node_modules/next/dist/docs/` first.

### D6. Markdown at the boundary — reads yes, writes need care
Tools return note bodies as Markdown; Claude reads it far more reliably than editor JSON. Writes are harder: `saveNoteBody` replaces the whole body, so converting Claude's Markdown back to Tiptap would drop attachment nodes, font sizes, colors and alignment, and leave orphaned files in Storage. Decide before `mcp-write`:
- block-level edits (Claude names blocks to replace or insert; untouched blocks keep their JSON), or
- an append/insert-only write tool first, with full rewrites refused for notes that hold attachments or styling.
"Ask Claude to only change the part it edited" is not enough on its own, because the save is whole-body.

### D7. Tool safety
Tools carry MCP annotations (read-only, destructive) so Claude asks before risky ones. Trash is allowed (restorable); permanent delete is not offered. Only note bodies have a version check today; rename, move and trash need one (e.g. pass the item's `edited_at` and refuse on mismatch) before they are exposed. A tool that hits a conflict returns it to Claude with the current state instead of retrying.

### D8. Token checks and scope
- **Verification:** a new bearer-token path verifies the Supabase JWT signature (JWKS), issuer, audience and expiry, then calls `runAsUser`. It must never decode claims without verifying them. `withUserDb` and the Server Actions are not reused as-is (they read cookies).
- **Scope:** an OAuth token is an ordinary `authenticated` Supabase JWT, so the holder can call PostgREST and Storage directly and skip the MCP tools — including permanent delete and settings. Limit OAuth tokens in the database: RLS policies (or a restrictive policy) that check the `client_id` claim and deny delete on `items`, writes to `user_settings`, and Storage deletes. Without this, the "no permanent delete" rule is advisory only.
- **Storage:** attachment links need a Storage client built from the bearer token (or signed by the server after the RLS read), not the cookie-based `createClient()`.

## Risks / Trade-offs

- [Supabase OAuth server is new; beta status not stated in its docs] → before building, confirm it is on for the project (`<project>/.well-known/oauth-authorization-server/auth/v1` returns JSON) and connect Claude to a minimal one-tool server.
- [Markdown writes wipe attachments and styling, since saves are whole-body] → see D6; test with real notes that hold images and styling.
- [Any client can register (dynamic registration), and an approved token reaches the REST and Storage APIs directly] → D8 database limits; consent page shows the client name; a "connected apps" list with revoke.
- [An idle open tab takes a newer version number without reloading the text, so the next keystroke may overwrite Claude's edit] → check how `refreshed` is dispatched before `mcp-write`; reload the content, or treat a version bump the tab didn't make as a conflict.
- [Claude acts on a stale tree (rename, move, trash)] → D7 version check on tree writes.
- [Prompt injection: pasted web content in a note tells Claude to trash or rewrite items, and users approve tool prompts by habit] → keep destructive tools off by default or behind a separate consent; cap bulk actions; Trash stays restorable.
- [Large subtrees or notes blow up tool responses] → depth limits and pagination.
- [Next 16 may not serve the dot-prefixed `.well-known/oauth-protected-resource` route] → verify in the `mcp-auth` spike; a rewrite in `next.config.ts` is the fallback.
- [Vercel Hobby plan is non-commercial] → not new to this change, but matters if ToughBubble is ever paid.

## Spike findings (2026-10-06)

Done from docs, the installed packages and the project config; nothing was built.

- Confirmed: no extra Supabase charge (MAUs only); OAuth tokens are Supabase JWTs that RLS honours; dynamic registration supported; consent methods present in the installed auth library.
- Not confirmed: whether the OAuth server is on in this project (the live discovery check could not run from the sandbox); beta status; Client ID Metadata Document support.

Sources:
- https://supabase.com/docs/guides/auth/oauth-server
- https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
- https://supabase.com/changelog/38022-oauth-2-1-server-capabilities-for-supabase-auth
- https://claude.com/docs/connectors/custom/remote-mcp
- https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel

## Estimate (judgment, not measured)

- `mcp-auth` (OAuth setup, consent page, metadata, bearer verification, D8 database limits, end-to-end test with Claude): ~3–5 days
- `mcp-read` (read tools, Tiptap → Markdown, bearer-scoped Storage links): ~2–3 days
- `mcp-write` (block-level writes, tree version checks, conflict and injection tests): ~4–6 days
- Total: ~9–14 working days (~2–3 weeks). Revised 2026-10-08 after a design review raised token scope, whole-body saves and tree conflicts.

## Open Questions

- Does Supabase support Client ID Metadata Documents (Claude's recommended option)? Dynamic registration works either way.
- Official Tiptap Markdown extension vs. a hand-written converter.
