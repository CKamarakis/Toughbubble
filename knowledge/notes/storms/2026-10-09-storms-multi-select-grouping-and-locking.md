---
title: "Storms: multi-select, grouping and locking"
date: 2026-10-09
tags:
  - storms
  - selection
  - grouping
  - locking
source: voice
---

Feature 4 of the storms requirements. Screenshots: `knowledge/assets/Storms/Multiple items/`, `shapes/` (grouping).

## Selecting several items

- Shift+click adds an item to the selection or removes it.
- The selection box selects only items fully inside it.
- Ctrl+A selects everything on the board.
- Resizing a selection scales everything together, the same as a group.
- Auto-arrange (v1): an icon appears on a multi-selection; one click tidies the items into a grid, aligned vertically and horizontally with equal gaps.

## Grouping

- Ctrl+G groups, Ctrl+Shift+G ungroups (also in the right-click menu).
- Click selects the whole group; double-click goes in to select one item inside it.
- Groups can contain groups.
- Resizing a group resizes everything inside it in proportion.

## Locking

- A locked item is fully frozen: it can't be moved, resized, deleted or edited (text, colour).
- Clicking still selects it, so it can be unlocked.
- When a multi-selection is moved or edited, its locked items stay as they are.
- A small lock icon shows on hover or selection.

## Also confirmed

- Emoji reactions on sticky notes: later, not v1.
