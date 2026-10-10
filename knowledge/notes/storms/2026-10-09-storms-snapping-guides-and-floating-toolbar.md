---
title: "Storms: snapping, guides and floating toolbar"
date: 2026-10-09
tags:
  - storms
  - snapping
  - toolbar
source: voice
---

Feature 6 of the storms requirements. Screenshots: `knowledge/assets/Storms/Multiple items/`, `shapes/` (equal width).

## Snapping and guides

- Edges and centres: dashed guides appear while dragging when an item's edges or centre line up with a nearby item, and the item snaps into place.
- Equal gaps: guides show when a gap matches another gap between items, horizontally and vertically, and the item snaps to it.
- Equal size: while resizing or drawing, a guide shows when the width or height matches a nearby item, and it snaps to that size.
- Applies to multi-selections and groups as well as single items.
- "Nearby" = items on screen within a short distance (also keeps big boards fast).
- Hold Alt while dragging to turn snapping off for that drag.
- The background grid is a visual hint only; items don't snap to it.
- Arrow keys move the selection by 1px; Shift + arrow by 10px.

## Floating toolbar

- A toolbar floats above the selected item(s) and holds all style options: font, size, bold, alignment, link, text colour, highlight, border, fill, lock.
- The right-click menu keeps actions: copy, paste, duplicate, delete, arrange, group, lock, copy/paste style.
