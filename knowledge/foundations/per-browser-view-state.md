---
title: Open folders and the contents sort are remembered per browser, not per account
status: current
---

## In short
- Which folders are expanded, and the sort on project and folder pages, are kept in the browser's local storage.

## Why (evidence)
- A cookie would let the server draw the page with them already applied, but it limits how many folder ids fit (phase-1-sidebar-tree, Risks).

## Gives you
- Nothing to save on the server. Changes apply at once.

## Limits you
- After a full reload, the tree shows collapsed and the sort shows "Newest" for a moment, until the browser applies your saved choice.
- Each device and browser has its own state. Two tabs share it.

## Revisit if
- The flash after a reload bothers people, or you want these choices on every device.

## Affects
- workspace-tree: Expand and collapse, Open items, Contents view and sorting.

## History
- 2026-09-22 phase-1-sidebar-tree: D7.
- 2026-09-25 sidebar-collapse-open-path: added a stored "last revealed item", so a reload doesn't expand folders you collapsed again (D1).
