---
title: "Storms spikes 2-4: data, images and undo"
date: 2026-10-10
tags:
  - storms
  - spike
  - data-model
  - images
  - undo
source: text
---

Spikes 2–4 for Storms v1 (canvas, 1,000 items). Throwaway scripts in Claude's scratch space, not in the repo.

## Spike 2: data and saving

**Measured** (synthetic board with the planned data model; mix based on the real boards: 55% stickies, 17% shapes, 12% text, 12% arrows, frames, images):

| Items | Board JSON | Gzipped | Save: 1 item edited | Save: 20 items dragged |
|---|---|---|---|---|
| 100 | 38 KB | 7 KB | 0.4 KB | 1.4 KB |
| 500 | 187 KB | 32 KB | 0.3 KB | 1.4 KB |
| 1,000 | 377 KB | 66 KB | 0.3 KB | 1.4 KB |

- About 385 bytes per item. Matches the Miro backups (compressed board data 3–47 KB per board).
- Text-heavy boards could roughly double this (estimate).

**Existing code to reuse:** `items.kind` already includes `storm`; `item_content` stores a `jsonb` body with a `version`; notes save with a version check (`src/lib/notes/operations.ts`) and a tested autosave state machine (`src/lib/notes/autosave.ts`, 1 s pause, retries, "Changed elsewhere"). Next.js caps Server Action bodies at 1 MB (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md`); notes cap bodies at 800 KB.

**Recommendation:**
- Store each storm as **one `jsonb` body in `item_content`**, with items keyed by id. Reuse RLS, versions, trash, duplicate, and the autosave state machine. A table row per item is overkill for single-user.
- **Send change sets, not the whole board**: `{ upsert: [...], delete: [...] }` with the base version, usually under 2 KB. The server merges by id inside the transaction and bumps the version. This keeps saves far below the 1 MB limit at any board size.
- Board size cap: about 2 MB of JSON (roughly 5,000 items), checked on the server. The first load sends the whole board once (377 KB at 1,000 items, about 66 KB over the wire when compressed).
- Two tabs: keep the notes behaviour (version conflict → "Changed elsewhere").

## Spike 3: images

**Measured** with 17 real images from the Miro backups (Solution sprint, Team trust) in Chrome:

| | Total |
|---|---|
| Original files | 5,271 KB |
| Stored with today's notes pipeline (2,560 px max, re-compress only above 1.5 MB) | 2,295 KB |
| Stored if always converted to WebP 0.85 | 595 KB |
| 512 px previews | 192 KB |
| Memory when drawn at full size | 23.5 MB |
| Memory when drawn as previews | 7.6 MB |

- Gap in today's pipeline: a 1,148×868 PNG of 1.25 MB is kept as is, because it's under the 1.5 MB threshold.

**Recommendation:**
- Storms images: **always convert PNG/JPEG to WebP** (keep the original only if it's smaller), still capped at 2,560 px. About 4× less storage on this sample. Consider the same for notes.
- **Store a 512 px preview** with each image (about 5–10% extra storage). Draw the preview unless the image is shown larger than 512 px on screen; load the full image only when zoomed in, and release full images that go off-screen.
- Reuse the `attachments` table and private bucket, with `item_id` = the storm. Duplicating a storm copies its attachments, as notes do.

## Spike 4: undo that survives a reload

- Undo entries are inverse change sets: usually 0.3–1.4 KB; the worst case (deleting 1,000 items) is about 377 KB. 30 steps typically stay under 50 KB.
- **Recommendation: keep undo history in the browser (IndexedDB)**, keyed by user and storm, saved together with the storm version. On reload, restore it only if the server version still matches; otherwise drop it. No server cost.
- Not `localStorage`: it's synchronous and limited to about 5 MB.
- Privacy: clear stored history on sign-out (shared computers).
