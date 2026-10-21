---
title: Attached files go straight from the browser into a private Supabase Storage bucket
status: current
---

## In short
- Files sit in one private Supabase Storage bucket, `attachments`, organised by user, then note.
- The browser uploads directly, signed in as the user. You only ever see files through links that expire after 1 hour.

## Why (evidence)
- Server Actions accept at most 1 MB per request, so files can't go through them.
- Uploading as the user keeps the database's per-user access checks on every file action. A server client with the secret key was rejected because it bypasses those checks (see [[supabase-rls-per-owner]]).
- Storms were planned to reuse the same storage.

## Gives you
- A stored file can't be replaced, and no one can reach another user's files.
- Short-lived links keep files private even if a link leaks.

## Limits you
- No upload percentage (the upload method reports none).
- Images download again on each visit because their links are reissued.
- Files left unused, or not removed after a failed delete, stay in storage until a clean-up job runs (not built yet).

## Revisit if
- Storage nears the free plan's 1 GB.
- Account deletion is built: it must also remove the user's `attachments/<owner_id>/` folder.

## Affects
- note-attachments.
- Duplicating a note, which copies its attachments.
- Storms, which were planned to reuse this storage.

## History
- 2026-09-23 phase-3-attachments: bucket, access rules, upload flow and 1-hour links (design D1, D3, D5; risks).
- 2026-10-17 storms-canvas: Duplicate note copies attachments through the existing copy step (design).
