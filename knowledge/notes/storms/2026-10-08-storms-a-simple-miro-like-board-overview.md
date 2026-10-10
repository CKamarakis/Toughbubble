---
title: "Storms: a simple Miro-like board (overview)"
date: 2026-10-08
tags:
  - storms
  - vision
source: voice
---

Start of a bigger project: a simple version of Miro, called Storms. Screenshots per feature, plus more complex examples of where this is going, are in `knowledge/assets/Storms/`. More notes will follow per feature.

## Canvas

- A board is a workbench: an empty space where you create things and move them freely.
- Zoom in and out.
- Left click selects items.
- Holding right click grabs the space so you can pan around.
- A single right click on a selected item shows its options.

## Main items

1. **Sticky notes**: small square items you write text in, to organise thoughts.
2. **Shapes**: rectangle, circle, square, triangle and so on. They have borders, background colours and text.
   - A sticky note is really a square shape with a preset size and no border, so you can create one faster.
3. **Text**: created freely. Change its size, make it bold or italic, add links and so on.
4. **Images**: can be uploaded and placed on the board.

## Combining items

- Items can sit on top of each other to build things: for example a rectangle with text, sticky notes, an image or another shape dropped on top of it, all by drag and drop.
- This needs layer order (z-index). A new item goes on top of everything by default. You can change that: bring to front, send to back, and so on.

## Connectors

- Selected items can be connected with arrows to make flows that guide the reader or your own thinking.
- Treat one item as a square, so it connects from the top, bottom, left or right. A group of items connects the same way.

## Helpers

- Visual guides when creating an item, for example to match the size of another item.
- Help aligning many items and keeping equal spacing, both vertically and horizontally.

## Lock and group

- Items move freely unless they're locked. A locked item keeps its size and position, even when it's part of a selection that is moved or edited together.
- Items can be grouped (for example two rectangles and some text). Resizing the group resizes everything inside it in proportion.

## Next

There are many requirements across these features, so they need structure. Go feature by feature and capture one note each in `notes/storms/`.
