# Proposal

PRD: knowledge/prds/storms-v1.md @ 257de96

## Why

Storms are already in the tree, but opening one shows only a placeholder. Storms v1 is too big for one change, so it is built in five slices, each usable on its own. This first slice builds the base every later slice depends on: the board itself (zoom, pan, always light), saving with change sets and a version check, and undo that survives a reload. It proves all of that end to end with one minimal item, a plain-text sticky, and leaves the hard rich-text-on-canvas work to storms-items.

## What Changes

**Opening a storm**
- From: the item page shows the title and "The Storm canvas arrives in a later phase."
- To: a slim header (breadcrumb, title, ⋯ menu) and an always-light board filling the rest of the pane.
- Reason: storms become usable.
- Impact: non-breaking.

**New: the board**
- Zoom 10%–400%: mouse wheel toward the pointer, Ctrl + wheel and pinch, +/− buttons, a % readout (click for 100%), fit to all items; keyboard shortcuts. The page itself never zooms.
- Pan with a two-finger trackpad scroll, right-drag (no browser menu on the board) or Space + drag; limited to ±1,000,000 px.
- A dot grid that fades out when zoomed far out.
- Each storm reopens at the zoom and position the user left (kept in the browser).
- Bottom toolbar with the tools that work in this slice only: Select, Sticky, Undo, Redo.

**New: plain-text sticky (minimal)**
- Yellow 200×200 sticky placed with the Sticky tool; select, drag, nudge with arrow keys, delete with Delete/Backspace.
- Double-click or Enter to type plain, centred text in one size; overflow is clipped for now.

**New: saving and undo**
- Autosave about 1 s after the last change, sending only the changed stickies with the version they are based on; "Saving…" / "Saved", retries, warning on leaving with unsaved work, as notes do.
- "Changed elsewhere" across tabs with Load latest / Keep mine.
- Board size capped at about 2 MB with a clear message.
- 30 undo/redo steps that survive a reload when the storm hasn't changed since; wiped on sign-out.

**Duplicate a storm**
- From: no item can be duplicated.
- To: storms get "Duplicate" in their ⋯ menu: the copy, "<title> (copy)", appears directly below the original with all its stickies and opens. Notes get it in a later change.
- Impact: non-breaking.

**Shared code**
- The notes autosave state machine moves to a shared place and learns a "too large" state; notes behave the same.
- The dark-mode style rule gains an exception so the board stays light in dark mode.

**Deferred** (each with its owning slice, listed in `design.md`): other item types, sticky colours and resize, rich text and shrink-to-fit, right-click menu, selection box and multi-select, layers, groups, locks, connectors, snapping, shortcut list, duplicate for notes, tablet and touch, screen-reader access to board content.

## Capabilities

### New Capabilities

- `storm-board`: opening a storm, the always-light board, zoom, pan, fit, grid, board limits, last view, the bottom toolbar, and the minimal plain-text sticky (place, select, move, nudge, type, delete).
- `storm-saving`: autosave with change sets and a version check, "Changed elsewhere", the size cap, server-side validation and ownership, and undo/redo that survives a reload and is wiped on sign-out.

### Modified Capabilities

- `workspace-tree`:
  - Open items: Storms show their board instead of a placeholder.
  - Item menu layout: a Storm's menu gains Duplicate.
  - New requirement: Duplicate a storm (title, placement, copied content).
- `note-editor`: drops "Storms SHALL keep their placeholder" from the note-opening requirement.

## Impact

- **Code**: new `src/lib/storms/` (model, change sets, camera, history, hit-test, wheel classification, limits, validation, operations, actions) and `src/components/storms/` (engine store, renderer, input, view, toolbar, zoom control, text overlay, autosave, undo and view stores); `items/[id]/page.tsx` and `item-view.tsx` load and show storms; `item-menu.tsx` gains Duplicate; `account-menu.tsx` clears stored undo history on sign-out; `src/lib/notes/autosave.ts` moves to `src/lib/autosave.ts`; `globals.css` dark variant.
- **Data**: no schema change. Storm boards use the existing `item_content` table and `storm` kind.
- **Dependencies**: Playwright as a dev dependency for the speed benchmark; `fractional-indexing` is already installed.
- **Browser storage**: IndexedDB (`storms-undo`) for undo history, `localStorage` for the last view per storm.
- **Tests**: unit and integration tests per `design.md` D11, plus an automated 1,000-sticky speed gate.
