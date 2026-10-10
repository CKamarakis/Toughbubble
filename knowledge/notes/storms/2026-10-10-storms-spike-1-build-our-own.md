---
title: "Storms spike 1: build our own"
date: 2026-10-10
tags:
  - storms
  - spike
  - rendering
  - licensing
source: text
---

Spike 1 (rendering and library), desk research. Decision: **build our own**; borrow from open-source code where the licence allows. A hands-on benchmark follows in a separate note.

## Decision

- No paid licence: this is our own software, so we build Storms ourselves.
- Use open-source libraries for helpers, but not a whole board engine.
- Bottom toolbar, like Figma and tldraw, instead of Miro's left rail. Replaces the toolbar position in the canvas note.

## Libraries checked

- **Excalidraw** (MIT, v0.18.1, React 19 OK, client-only in Next.js): covers canvas, frames, groups, locks, layers, opacity, bound and elbow arrows, snapping and undo. Gaps: no rich text (bold, italic, lists), a fixed font set, a fixed shape set (no triangle, star or speech bubble, as far as we know), no sticky notes with auto-fit, right click opens its own menu, and its UI is only partly customisable.
- **tldraw**: the closest fit (rich text, stickies, custom shapes and UI), but not open source. npm licence: "SEE LICENSE IN LICENSE.md". Production needs a key: 100-day trial, hobby with a watermark, or commercial at a price on request. Rejected: no paid licence. Studying its UX is fine; copying its code isn't.
- Sources: https://tldraw.dev/sdk-features/license-key, https://tldraw.dev/pricing, https://tldraw.dev/sdk-features/rich-text, https://github.com/excalidraw/excalidraw

## What we can borrow

- **Excalidraw's MIT code**, keeping its copyright notice: arrow binding, elbow-arrow routing, snapping maths, hit-testing.
- Borrow modules, not a fork: a fork means maintaining their monorepo and keeping their text model.
- **TipTap 3**, already used by the notes editor: rich text inside shapes and stickies (bold, lists, links).

## Confidence in building it (Claude's assessment)

- High: canvas, zoom and pan, items and styling, layers, selection, groups, locking, frames, undo and autosave, images (existing pipeline), snapping guides.
- Medium: connectors (elbow routing is the hard part; Excalidraw code helps), rich text with auto-fit, 1,000-item performance (depends on how we draw the board).
- Lower: the feel on edge cases. It gets good through rounds of testing with the user and testers.
- Expect it to work on day one; the polish comes from feedback.
