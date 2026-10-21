---
title: Archive and trash mark a whole subtree with the item acted on
status: current
---

## In short
- Archiving or trashing marks every item underneath with the same status, and records which item you acted on.
- Restore brings back every item with that record, in one step.

## Why (evidence)
- Each step touches only the items it needs. The Archive and Trash views just list the items you acted on (phase-1-sidebar-tree D3).

## Gives you
- Restore brings back exactly what left together. Items you archived or trashed on their own keep their own record and stay put.
- Undo reuses Restore, with no new server code (shell-hardening D1).

## Limits you
- Trashing takes archived items inside along with it. On restore they come back active, not archived.
- The database checks that an active item's parent is active only at the end of each save, so a whole subtree can come back at once (phase-1-sidebar-tree D4). [[database-enforced-integrity]]

## Revisit if
- Restoring should put items back into their earlier archived state.

## Affects
- archive-trash: Archive items, Move items to Trash, Archive and Trash views, Restore, Undo archive and trash.

## History
- 2026-09-22 phase-1-sidebar-tree: D3 and D4.
- 2026-10-09 shell-hardening: Undo built on Restore.
