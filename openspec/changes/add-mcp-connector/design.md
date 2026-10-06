# Design

## Context

See proposal.md for the why. Facts from the codebase that shape the approach:

- `runAsUser(claims, fn)` in `src/db/rls.ts` runs a transaction with the role set to `authenticated` and `request.jwt.claims` set, so `auth.uid()` and every owner-only policy apply. Anything that can produce a verified `sub` gets per-user isolation for free.
- Tree and note logic lives in plain functions that take a transaction (`src/lib/tree/operations.ts`, `src/lib/notes/operations.ts`); Server Actions only wrap them. MCP tools can call the same functions, as the integration tests do.
- `saveNoteBody` rejects a save whose base version is stale (`src/lib/notes/operations.ts`), and the editor already shows "Load latest / Keep mine" on conflict (`src/lib/notes/autosave.ts`). A Claude edit to an open note surfaces there instead of being lost.
- Note bodies are Tiptap JSON. Storms are not built yet.

```
Claude Code ----+
                +--HTTPS + OAuth bearer--> /api/mcp (Next route, Vercel)
claude.ai ------+                               |
(web/Desktop/mobile)                     verify Supabase JWT -> sub
                                                |
                                     runAsUser({sub, ...}) --> existing operations --> Postgres (RLS)
                                                |
                                     Tiptap JSON <-> Markdown
```

## Goals / Non-Goals

**Goals:**
- One server and one sign-in flow for Claude Code and claude.ai.
- Read and write notes and the tree, with RLS as the only access control.

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

### D6. Markdown at the boundary
Tools return note bodies as Markdown and accept Markdown for writes; the server converts to and from Tiptap JSON. Claude reads and writes Markdown far more reliably than editor JSON.

### D7. Tool safety
Tools carry MCP annotations (read-only, destructive) so Claude asks before risky ones. Trash is allowed (restorable); permanent delete is not offered. Writes go through the existing version check.

## Risks / Trade-offs

- [Supabase OAuth server is new; beta status not stated in its docs] → before building, confirm it is on for the project (`<project>/.well-known/oauth-authorization-server/auth/v1` returns JSON) and connect Claude to a minimal one-tool server.
- [Markdown round-trips lose formatting such as font sizes, colors, alignment] → limit Claude's edits to the parts it changed, or warn in the tool description; test with real notes.
- [Any client can register (dynamic registration)] → consent page shows the client name; consider a "connected apps" list with revoke.
- [Large subtrees or notes blow up tool responses] → depth limits and pagination.
- [Prompt injection through note content] → low today (single-user content); revisit when sharing arrives.
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

- `mcp-auth` (OAuth setup, consent page, metadata, end-to-end test with Claude): ~2–4 days
- `mcp-read` (read tools, Tiptap → Markdown): ~2–3 days
- `mcp-write` (write tools, Markdown → Tiptap, conflict tests): ~3–5 days
- Total: ~1.5–2 weeks

## Open Questions

- Does Supabase support Client ID Metadata Documents (Claude's recommended option)? Dynamic registration works either way.
- Official Tiptap Markdown extension vs. a hand-written converter.
