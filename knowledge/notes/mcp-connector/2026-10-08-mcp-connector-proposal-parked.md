---
title: "MCP connector: proposal (parked)"
date: 2026-10-08
tags:
  - mcp
  - parked
source: proposal.md
---

# Proposal

> **Status: parked (2026-10-06).** Captured from an explore session and an auth spike. Only `proposal.md` and `design.md` exist; specs and tasks come when the work is picked up (`/opsx:continue` or `/opsx:propose`). Rough size: 2–3 weeks of focused work (revised 2026-10-08 after a design review), so it was deferred.

## Why

People keep their notes and projects in ToughBubble but do their thinking and writing with Claude. Today the only bridge is copy and paste. An MCP server would let Claude read a user's workspace and write back to it, from Claude Code and from claude.ai (web, Desktop, mobile).

## What Changes

- A remote MCP server served by this app (one route, e.g. `/api/mcp`, deployed with the rest of the app on Vercel).
- Sign-in through OAuth 2.1, with Supabase Auth as the authorization server and a ToughBubble consent page ("Allow Claude to access your workspace?"). The same flow serves Claude Code and claude.ai custom connectors.
- Read tools: browse the tree, search titles, read a note (as Markdown), read a project with its subtree.
- Write tools: create a note, edit a note's body or title, move an item, send an item to Trash. No permanent delete.
- Every tool runs as the signed-in user, so existing row-level security keeps each workspace private.
- Suggested split into three changes when picked up: `mcp-auth` → `mcp-read` → `mcp-write`.

## Capabilities

### New Capabilities
- `mcp-connector`: connecting Claude to a user's workspace — sign-in and consent, the read and write tools, and what each may touch.

### Modified Capabilities
<!-- Possibly `user-auth` (a consent page and the list of connected apps) — decide when the specs are written. -->

## Impact

- **New route:** the MCP endpoint plus OAuth discovery metadata (`.well-known/oauth-protected-resource`).
- **New page:** the OAuth consent screen, inside the signed-in app.
- **Reused:** `src/db/rls.ts` (`runAsUser`), `src/lib/tree/operations.ts`, `src/lib/notes/operations.ts` (including the version check on save).
- **New logic:** Tiptap JSON ↔ Markdown conversion.
- **Supabase:** turn on the OAuth 2.1 server and dynamic client registration in the dashboard.
- **Dependencies (expected):** `mcp-handler`, `@modelcontextprotocol/sdk`; possibly `@supabase/server` and a Tiptap Markdown extension.
- **Cost:** no new services. Supabase charges nothing extra for the OAuth server; Claude sign-ins count toward monthly active users.
