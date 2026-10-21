---
title: Sidebar drag uses dnd-kit's core only, and only for mouse and pen
status: current
---

## In short
- Drag in the tree uses `@dnd-kit/core` without its sortable add-on. A 2px line shows where the item will land.
- Only mouse and pen start a drag. Touch never does.

## Why (evidence)
- react-arborist was rejected: its reordering features would go unused, and its styling fights the app's look (phase-1-sidebar-tree D5).
- The sortable add-on was skipped because the tree isn't a flat list and only needs a line indicator (sidebar-manual-order D4).
- Touch drag was dropped because swipes fought drag, and it removes the clash between long press and drag (shell-hardening D3).

## Gives you
- On touch screens, swipes always scroll and a long press opens the row menu.

## Limits you
- No drag to reorder on touch, and no keyboard drag. The keyboard sensor would add a Tab stop on every row. The menu and "Move to…" cover both.

## Revisit if
- Tablet or touch reordering by drag becomes a goal.

## Affects
- workspace-tree: Reorder items, Move items with Move to, Touch-friendly rows.

## History
- 2026-09-22 phase-1-sidebar-tree: dnd-kit chosen to drag items into other folders.
- 2026-09-25 sidebar-manual-order: dragging changed to reorder only.
- 2026-10-09 shell-hardening: touch drag removed.
