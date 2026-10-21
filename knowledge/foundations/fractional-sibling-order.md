---
title: Sidebar order is stored as sortable position keys, and a reorder saves the whole group
status: current
---

## In short
- Each item has a text position key (from the `fractional-indexing` library) that sorts in byte order. The sidebar sorts by kind group, then by key, then newest first.
- Reordering saves new keys for the whole group in one go, rather than one key between two neighbours.

## Why (evidence)
- Items that were never reordered all have the same default key ('a0'), so there is no room for a key between them. Saving the whole group gets around that (sidebar-manual-order D2).
- Adding the feature needed no database migration. Untouched groups tie on the key and fall back to newest first, so nothing visibly changed (sidebar-manual-order D1).

## Gives you
- Your own order, saved to your account and the same on every device.
- New and moved items go to the top by taking a key before the smallest one (sidebar-manual-order D3).

## Limits you
- Every reorder or duplicate writes every item in the group. That is fine for small groups.
- If the group changed elsewhere, the save is refused and you drag again. When two tabs reorder at once, the last reorder wins.

## Revisit if
- Groups grow large enough that saving the whole group again feels slow.

## Affects
- workspace-tree: Sidebar tree, Create items, Move items with Move to, Reorder items, Duplicate a storm, Duplicate a note.

## History
- 2026-09-22 phase-1-sidebar-tree: manual order dropped in favour of a fixed order. The `position` column was kept for later.
- 2026-09-25 sidebar-manual-order: manual order added with the group rewrite.
- 2026-10-17 storms-canvas: Duplicate saves the group's order again to put the copy below the original (D10).
