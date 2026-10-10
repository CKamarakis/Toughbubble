---
title: "Storms: connectors"
date: 2026-10-09
tags:
  - storms
  - connectors
source: voice
---

Feature 5 of the storms requirements. Screenshots: `knowledge/assets/Storms/connect items/`.

## Creating

- Hover over or select an item: 4 connection dots appear (top, bottom, left, right). Drag from a dot to another item to connect them.
- Any item can be connected, including images (for example, an arrow from a screenshot to a sticky note) and groups.
- Arrows can also start or end on empty canvas, unattached. This also covers the lines and arrows in the shapes menu.

## Behaviour

- Moving a connected item: its arrows follow and stay on the side chosen.
- Deleting an item deletes its arrows.

## Style

- Line types: straight, elbow, curved.
- Reshape: drag points on curved and elbow lines (one draggable midpoint per segment).
- Thickness, solid/dashed/dotted, colour, arrowhead at start, end, both or none, and a button to reverse the direction.

## Not doing

- Suggestion arrow (a faded arrow offering to connect to the next item): later.
- Text labels on arrows: no; use a normal text item instead.
- Line jumps (a small hop where two lines cross): skipped.
