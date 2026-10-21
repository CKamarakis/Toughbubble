---
title: The database itself keeps each user's data private
status: current
---

## In short
- Every table and stored file is limited to its owner by Supabase row-level security (RLS).
- Every request runs as the signed-in user, so these rules apply every time, not only as a backup.

## Why (evidence)
- If the app had to filter by owner itself, one forgotten filter would leak data. That approach was rejected while exploring.
- Supabase Auth issues the identity the database checks, so one system covers both sign-in and data access.

## Gives you
- A missing owner filter in a query still returns only your data.
- Owner is filled in by the database; app code can't set it to someone else.
- The same model covers files: storage paths start with the owner's id and are checked the same way.

## Limits you
- One back-door database connection skips these rules (for migrations and tests). A lint rule stops page code from importing it.
- Uses a connection setup that needs `prepare: false` with Supabase's connection pooler.

## Revisit if
- Sharing or collaboration across users is added (rules are strictly owner-only).

## Affects
- workspace-data, user-auth, note-attachments, editor settings, and every feature that stores data.

## History
- 2026-09-22 phase-0-foundation (design D3, D5): run-as-user requests and owner-only policies.
- 2026-09-23 phase-2-notes-editor (design D9): settings table uses the same owner-only policies.
- 2026-09-23 phase-3-attachments (design D1): private file storage with owner-only policies.
