---
title: "Storms: extras and gaps from complex examples"
date: 2026-10-09
tags:
  - storms
  - gaps
  - v1-scope
source: voice
---

Remaining v1 decisions, plus gaps found by reviewing the complex example boards in `knowledge/assets/Storms/complex examples/`. These override earlier notes where they differ.

## Decisions

- **Undo/redo:** 30 steps, kept across a page reload.
- **Keyboard shortcuts:** one list, mostly copied from Miro. Claude drafts it; the user skims it.
- **Performance target:** 500 items running smoothly in v1. Test against a dense board like the Blue ocean example, which probably has more.
- **Export** (PNG/PDF): later.
- **Tablet/mobile:** one topic, analysed separately once desktop works and we can see how it performs. The touch proposal in the canvas note is input for that, not a decision.

## Gaps from the complex examples (now v1)

- **Bulleted and numbered lists** in text and shapes. Overrides "lists later" in the item model note; 3 of the 4 example boards rely on them.
- **Arrow anchors anywhere on an item:** the 4 side dots stay as the quick option, and dropping an arrow anywhere on an item attaches it to that exact spot (for example, from a button inside a screenshot, as in the Better flow). Extends the connectors note.

## Seen in the examples, already covered

- Cards built from a shape + text + highlight + small badge (Doodling workshop): grouping and layers.
- Sticky notes as annotations, dotted arrows, section titles as plain text, images and screenshots.

## Out of scope

- Charts, tables and device frames: use images or shapes for now.
- The tilted image in the Doodling board needs rotation, which is v2.

## Pending input

- The user may export Miro board data. The useful part is item JSON (REST API or a `.rtb` backup) showing positions, styles and how connectors attach. Which formats their plan allows is unknown.
