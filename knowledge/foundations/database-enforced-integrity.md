---
title: Tree and ownership rules are checked by the database, not just the app
status: current
---

## In short
- Same-owner parents and content, containers-only children, no loops, and active parents are checked by the database itself.

## Why (evidence)
- The workspace-data spec requires these rules to hold for every write path, as with ownership. Checking only in the app was rejected.
- Built-in link rules were chosen over custom code where possible, because they are declared once and can't be bypassed.

## Gives you
- No feature, current or future, can break the tree by mistake.
- Permanent deletion takes the subtree and content with it automatically.

## Limits you
- The active-parent check runs at commit (so a restore of a whole subtree passes). Its errors show up late and must be turned into a readable message.
- Custom rules run on every write, walking up the tree; fine because trees stay shallow.

## Revisit if
- Trees grow very deep or large (thousands of items).

## Affects
- workspace-data, workspace-tree (create, move, convert), archive-trash (restore, delete forever).

## History
- 2026-09-22 phase-0-foundation (design D4): same-owner rules and cascading deletes.
- 2026-09-22 phase-1-sidebar-tree (design D4, Risks): tree rules added as database checks.
