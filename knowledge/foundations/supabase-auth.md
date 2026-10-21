---
title: Accounts run on Supabase Auth, with its built-in email for now
status: current
---

## In short
- Supabase Auth handles sign-up, sign-in, confirmation and password reset, with sessions stored in cookies.
- Emails currently go through Supabase's built-in sender with its default templates.

## Why (evidence)
- Supabase Auth issues the identity the database's privacy rules read, so one system covers both. Auth.js was rejected for that reason.
- The built-in sender is fine while only the owner uses the app.

## Gives you
- Sign-in and data privacy share one identity.
- Password rules and email confirmation are Supabase settings, mirrored by the app's own checks.

## Limits you
- The built-in sender only delivers to the project team's addresses, sends a few emails per hour, and doesn't allow editing the templates.
- Email links only work in the browser that started sign-up or reset.
- The app's password check must be kept in step with the Supabase setting by hand.

## Revisit if
- Anyone other than the owner is invited: set up custom SMTP and switch to the links that work in any browser (already built).
- Google sign-in comes back (deferred).

## Affects
- user-auth, workspace-data (identity for data privacy).

## History
- 2026-09-22 phase-0-foundation (proposal; design D2, Risks): chosen, Google sign-in deferred, built-in email limits accepted.
