---
title: "Storms spike 1: rendering benchmark results"
date: 2026-10-10
tags:
  - storms
  - spike
  - rendering
  - performance
source: text
---

Hands-on part of spike 1. Desk research: `notes/storms/2026-10-10-storms-spike-1-build-our-own.md`. Throwaway benchmark (not in the repo): a synthetic board of stickies and shapes with text, run in system Chrome via Playwright, viewport 1440×900.

## Setup and caveats

- Machine: AMD Ryzen 7 255, RTX 5070 laptop GPU, 62 GB RAM, which is strong. "Mid-range" was simulated with 4× CPU throttling; the GPU was not throttled.
- Synthetic items only (no images or arrows); one run per case.
- Phases: pan at 100%, zoom 100% → fit-all and back, hold fit-all while panning, drag 50 items at 50%.

## Rendering results (4× CPU throttle, fps; 60 = smooth)

| Items | HTML (plain) | HTML + culling + no text when far out | SVG | Canvas + culling + no text when far out |
|---|---|---|---|---|
| 500 | 60 / 60 / 60 / 60 | 60 / 55 / 58 / 60 | 60 / 8 / 57 / 59 | 60 / 56 / 60 / 60 |
| 1,000 | 60 / 57 / 49 / 60 | 60 / 48 / 44 / 59 | 44 / 1 / 1 / 1 | 60 / 56 / 60 / 60 |
| 2,000 | 60 / 49 / 13 / 26 | 60 / 39 / 20 / 58 | 38 / 1 / 10 / 18 | 60 / 56 / 60 / 60 |

(Columns: pan / zoom / fit-all / drag.) Unthrottled, canvas held 60 fps in every case up to 2,000 items; HTML and SVG dropped in the fit-all view from 1,000 items.

- SVG is out: it collapses when zooming large boards.
- HTML (with the same tricks as canvas) is fine up to about 500 items and degrades in the fit-all view at 1,000.
- Canvas is flat and smooth to 2,000 items.

## Rich text auto-fit with TipTap (300 stickies)

| | 1× | 4× throttle |
|---|---|---|
| A live TipTap editor in every sticky, fitted at load | 971 ms | 7,263 ms |
| Static HTML in every sticky, fitted at load | 503 ms | 3,860 ms |
| Re-fit per keystroke while typing | 2 ms | 16 ms |
| Mount one editor when editing starts | 2 ms | 17 ms |

- Fitting at load is too slow. **Store the fitted font size with the item** (computed when editing), so loading needs no fitting.
- Only mount TipTap on the sticky being edited; typing with live re-fit is smooth.

## Recommendation

- **Target 1,000 items: canvas + a single overlay while editing.** Draw every item on a canvas; while editing, mount one TipTap editor over the item being edited; selection handles and toolbars are normal HTML on top. Cost: we must draw our rich-text subset (bold, italic, underline, colour, highlight, links, lists, alignment, fonts) on canvas ourselves, and the edit overlay must match the canvas text exactly.
- **Target 500 items: HTML with culling** is simpler (TipTap's HTML renders as-is, links and accessibility come free) but has no headroom above about 500.
- Either way: store the fitted font size, render only what's on screen, drop detail when zoomed far out, and use small image previews (from the image memory risk).
