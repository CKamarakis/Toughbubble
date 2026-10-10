---
title: "Storms: item model"
date: 2026-10-08
tags:
  - storms
  - items
source: voice
---

Feature 2 of the storms requirements: what the items are and what they share. Screenshots: `knowledge/assets/Storms/shapes/`, `sticky notes basics/`, `text/`.

## All items

- Resize: corner handles keep proportions, edge handles stretch; Shift does the opposite.
- Duplicate: Ctrl+D, Alt+drag, and copy/paste, including between storms.
- Rotation: **v2** (roadmap). Left out of v1 because snapping, guides and connector anchors would all have to handle rotated items.

## Shapes

- v1 set: rectangle, oval, circle, rhombus, triangle, plus lines and arrows.
- Creation: a click places a default-size shape; dragging draws any size.
- Style: fill (white by default), border colour, thickness and style (solid, dashed, dotted), corner radius.
- Double-click to type inside; text is centred by default and uses the same formatting as free text.

## Sticky notes

- Own toolbar button (a preset of the square shape: no border, fixed size).
- Square by default; resizes while staying square.
- Can also be stretched to exactly double in one direction (1×2 tall or 2×1 wide), no further.
- Text auto-fits the note and rescales when the note is resized.

## Colours (all items)

- Our own preset palette, not Miro's. Derive it with colour theory (as with Adobe Color) so it matches the app palette (primary `#f7d000`, warm neutrals `#fbfbf9` / `#333129`).
- Cover: yellow, orange, red, pink, purple, light blue, dark blue, light green, dark green, brown, black, white. More than 8 is fine.
- Users can add their own colours and remove them; saved per user, across all storms (default taken, not explicitly confirmed).

## Text

- Formatting: size, bold, italic, underline, colour, alignment, links. Lists later.
- Box: grows with the text until you drag a width, then wraps. Needs testing.

## Images

- Upload from file, drag and drop, paste from the clipboard.
- Reuse the notes pipeline: 5 MB cap (`src/lib/attachments/rules.ts`), with large images scaled down and re-compressed on upload (`src/lib/attachments/prepare-image.ts`). Tell the user clearly when an image was resized.
