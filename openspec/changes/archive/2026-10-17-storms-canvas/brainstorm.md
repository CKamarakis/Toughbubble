## Design Summary

First slice of Storms v1 (PRD: `knowledge/prds/storms-v1.md`). A storm opens as an always-light board that fills the main pane under a slim header (breadcrumb, title, ⋯ menu). You can zoom (10%–400%, toward the pointer, +/−, %, fit), pan (trackpad, right-drag, Space + drag) and see a fading dot grid. One minimal item type proves the plumbing end to end: a plain-text yellow sticky you can place, select, move, nudge, type into and delete. Everything autosaves as small change sets with a version check ("Changed elsewhere" across tabs), and 30 undo steps survive a reload. Storms can be duplicated from the item menu. The toolbar shows only working tools: Select, Sticky, Undo, Redo.

Under the hood: a framework-free TypeScript engine (model, camera, change sets, undo, hit-testing, canvas renderer, input) with a thin React layer. Details in `design.md`.

## Alternatives Considered

### Alternative A: Framework-free engine core + thin React layer (chosen)
- **Approach**: plain TypeScript core owns board, camera, selection, tools, change sets and undo; draws to one `<canvas>`; React mounts the canvas and the HTML controls and subscribes via `useSyncExternalStore`.
- **Pros**: pointer moves never re-render React; core is unit-testable without a browser; natural home for later slices and borrowed Excalidraw (MIT) maths.
- **Cons**: a small custom store and event layer to build now.

### Alternative B: Board state in React
- **Approach**: board in `useReducer` or a store library; redraw the canvas on each state change.
- **Pros**: familiar; less plumbing at first.
- **Cons**: React work on every pointer move; engine logic tangled with components.
- **Why not chosen**: puts the 1,000-item smoothness goal at risk and makes every later slice harder.

### Alternative C: Fork Excalidraw's scene and renderer
- **Approach**: take Excalidraw's engine wholesale.
- **Pros**: much ready-made (binding, snapping, undo).
- **Cons**: text model and shape set don't fit (spike 1); maintaining a fork of their monorepo.
- **Why not chosen**: spike 1 decided to borrow modules, not fork.

## Agreed Approach

Alternative A. It matches the spike 1 benchmark (canvas + culling held 60 fps at 2,000 items under 4× CPU throttle; HTML and SVG fell behind from 1,000) and the spike 2 save design (change sets of about 1.4 KB). Saving reuses the tested notes autosave state machine.

## Key Decisions

- **Slice scope (option A)**: canvas plus a plain-text sticky only. Rich text, auto-fit, colours and resize go to `storms-items`, keeping the text-on-canvas risk out of this slice.
- **Layout (option A)**: slim header, board fills the rest of the pane, sidebar stays collapsible. No full-screen mode yet.
- **Duplicate (option B)**: "Duplicate" for storms only in this slice; notes get it later.
- **Toolbar (option A)**: only working tools (Select, Sticky, Undo, Redo); later tools appear with their slice.
- **Sticky v0**: yellow `#F7D000`, 200×200, plain centred text in one size, overflow clipped; tool returns to Select after placing.
- **Left-drag on empty board**: deselects only; selection box comes with multi-select in `storms-arrange`.
- **Right-click**: right-drag pans; the browser menu is suppressed on the board; our menu arrives in `storms-arrange`.
- **Undo across reload**: in this slice (IndexedDB), restored only if the server version still matches, wiped on sign-out.
- **Last view per storm**: zoom and position kept in the browser.
- **Gap fixes from the coverage check**: ±1,000,000 px board limit; board-only zoom for Ctrl+wheel / pinch / Ctrl +/−; wait for the sticky font before drawing text; storm code loaded only on storm pages; duplicate named "<title> (copy)" placed right after the original and opened; archived/trashed storms show "not found" like notes.
- **Independent review (2026-10-10)**: 16 findings against the PRD, spikes and code, all folded into `design.md` (font family from `next/font`, storm-only save path, stricter validation, undo snapshot timing, Keep mine reload, wheel listener, dark-variant scope, duplicate placement, fractional `z`, deferred items assigned to slices).
- **Verification**: requirement → test list, unit and integration tests, and an automated 1,000-sticky speed gate (median ≥ 50 fps, p95 frame ≤ 33 ms at 4× CPU throttle). The user checks behaviour by hand from a checklist.

## Open Questions

- Screen readers can't read stickies drawn on a canvas. Toolbar and zoom buttons get labels; a fuller accessible layer is not in the PRD. Raise for a later change?
- The speed bar is the PRD's proposal; confirm it once the benchmark first runs.
- Tablet and touch: unassigned, after desktop (engine uses pointer events so it stays cheap).
