---
title: Storms draw on one canvas with our own engine
status: current
---

## In short
- We built the board engine ourselves; every item is drawn on one canvas, and only the sticky being edited becomes a real text box.
- Libraries are borrowed for helpers (MIT code from Excalidraw, TipTap for rich text), never a whole board engine.

## Why (evidence)
- Canvas held about 60 fps up to 2,000 items under 4x CPU throttle; page elements slowed in the zoomed-out view from 1,000 items; SVG collapsed when zooming.
- tldraw fits best but needs a paid licence; Excalidraw lacks rich text, auto-fit stickies and a custom UI, and a fork means upkeep.
- The engine runs outside React so pointer moves never re-render the page.

## Gives you
- Smooth panning and zooming at 1,000 items (checked by an automated speed gate).
- Full control of the look and behaviour (Miro-like stickies, our own menus).

## Limits you
- We must draw rich text on the canvas ourselves, and the editor must match it exactly.
- Board content is invisible to screen readers (open question).
- Fitting text when a board opens is too slow, so the fitted size is stored per item.

## Revisit if
- Boards need well beyond 2,000 items, or accessible board content becomes a requirement.

## Affects
- storm-board (all of it), storm-saving (fitted size stored).

## History
- 2026-10-10: decided in notes `storms-spike-1-build-our-own` and `storms-spike-1-rendering-benchmark-results`.
- 2026-10-17: built in change `storms-canvas` (brainstorm Alternative A, design D1); stored text fit in `storms-sticky-style` (design D2-D4).
