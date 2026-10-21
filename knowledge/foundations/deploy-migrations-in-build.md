---
title: Each Vercel deploy updates its own database first
status: current
---

## In short
- Two Supabase projects: dev (previews and local) and prod (`main`).
- On Vercel, the build runs the database migrations before the new code goes live.

## Why (evidence)
- One shared database was rejected: schema experiments would hit real data.
- Applying migrations by hand was easy to forget and could ship code before its database changes existed.
- A GitHub Action was rejected: it races the Vercel deploy.

## Gives you
- Code and its database changes ship together.
- If the database address is missing, the build fails and the current version stays live.

## Limits you
- The old version keeps serving while the new one builds, so migrations must only add things, never break the old code.
- The free plan allows two active projects, so there's no separate staging database.

## Revisit if
- A migration needs to remove or rename something the live version still uses.

## Affects
- Every change that touches the database (workspace-data, notes, attachments, settings).

## History
- 2026-09-22 phase-0-foundation (design D6): two projects; migrations applied by hand at first.
- 2026-09-23 phase-3-attachments (design D11): migrations moved into the Vercel build at release.
