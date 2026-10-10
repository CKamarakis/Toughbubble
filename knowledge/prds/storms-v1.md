---
title: Storms v1
status: Building
change: storms-canvas
sources:
  - notes/storms/2026-10-08-storms-a-simple-miro-like-board-overview.md
  - notes/storms/2026-10-08-storms-canvas.md
  - notes/storms/2026-10-08-storms-item-model.md
  - notes/storms/2026-10-08-storms-layers-and-right-click-menu.md
  - notes/storms/2026-10-09-storms-multi-select-grouping-and-locking.md
  - notes/storms/2026-10-09-storms-connectors.md
  - notes/storms/2026-10-09-storms-snapping-guides-and-floating-toolbar.md
  - notes/storms/2026-10-09-storms-extras-and-gaps-from-complex-examples.md
  - notes/storms/2026-10-10-storms-lessons-from-real-miro-boards.md
  - notes/storms/2026-10-10-storms-spike-1-rendering-benchmark-results.md
  - notes/storms/2026-10-10-storms-spikes-2-4-data-images-and-undo.md
  - notes/storms/2026-10-10-storms-spike-5-palette-fonts-and-shortcuts.md
  - notes/storms/2026-10-10-storms-spike-1-build-our-own.md
  - notes/storms/2026-10-10-storms-palette-fonts-and-shortcuts-research.md
---

<!-- Keep it to one or two pages. Every section should help someone decide or build. Write "Unknown" or move it to Open questions rather than guessing. -->

## Problem

People who want to think visually (lay out ideas, plan, map a flow) find tools like Miro too heavy: too many tools, too much setup, built for teams. ToughBubble users work alone and aren't tech-focused (`PRODUCT.md`). Today they have no visual space inside ToughBubble, next to their notes.

**Bet:** if we build a light board (sticky notes, shapes, text, images, arrows, frames) that lives in the same tree as notes, users will be able to rebuild the boards they make today in Miro, without Miro's complexity, because we keep only the parts that real boards actually use.

## Users

Everyday people and early-stage small businesses who find Notion and Miro too heavy (`PRODUCT.md`). They use ToughBubble alone, on a desktop browser, to organise, plan and think things through. Their job here: put ideas on a free space, arrange them, connect them and come back later.

Assumption: the typical boards look like the user's own Miro boards (workshops, retros, planning, flows, MoSCoW grids). See `notes/storms/2026-10-10-storms-lessons-from-real-miro-boards.md`.

## Goals and success measures

- **Goal:** a user can build a real working board (areas full of stickies, a flow of connected shapes, an annotated set of screenshots) without leaving ToughBubble.
- **Measure:** three of the user's real Miro boards (Kaizen, Alternative company OKR process, Team trust) can be rebuilt in Storms with no missing feature. Yes/no.
- **Measure:** a storm with 1,000 items pans and zooms smoothly on a mid-range laptop. Yes/no; the exact bar is an open question.
- **Measure:** no lost work: autosave plus 30 undo steps survive a page reload. Yes/no.
- **Must not get worse:** the speed of the sidebar tree and notes, and storage use per user (images stay optimised).

## Scope

**In:**
- A storm as a node in the sidebar tree (create, move, nest, duplicate a whole storm).
- Canvas: unlimited board, zoom, pan, background grid hint, autosave.
- Items: sticky notes, shapes (rectangle, rounded rectangle, oval, circle, rhombus, triangle, star, speech bubble), lines and arrows, text, images, light frames.
- Layer order, multi-select, grouping, locking, connectors, snapping and guides, floating style toolbar, right-click menu, undo/redo.
- Desktop browser.

**Out (and why):**
- Rotation: v2; it complicates snapping, guides and connectors.
- Templates: v2; duplicating a storm covers the need for now.
- Comments: needs its own spec.
- Live collaboration: the product is single-user.
- Tablet and mobile: analysed after desktop works.
- Dark mode on the board: the workbench is always light (only the sidebar follows the theme).
- Export (PNG/PDF), emoji reactions, suggestion arrow: later. Arrow labels and line jumps: not needed.
- Charts, tables, device frames: use images or shapes; grids/tables are already planned for Storms v2.
- Importing Miro boards: `.rtb` data is encrypted.

## Requirements

**Storm and canvas**
- A storm is a tree node like a note: create, rename, move, nest, delete, duplicate (copies all items).
- All items are drawn on one canvas. While editing, one rich-text editor sits over the item being edited. Selection handles and toolbars are HTML on top of the canvas.
- The board is always light, whatever the app theme.
- The board has no visible limit; coordinates stay within a few million px of the origin.
- Zoom 10%–400%: the mouse wheel zooms toward the cursor, +/− buttons zoom in steps, the current % is shown, and a fit button shows all items.
- Pan with right-drag, Space + left-drag, and two-finger trackpad scroll. Left-drag on empty space draws a selection box.
- A light grid or dot background hint.
- Bottom toolbar (like Figma and tldraw): select, sticky note, shape, text, image, connector, undo, redo.

**Saving and undo**
- A storm is one stored record with a version. Saves send only the changed items, after a short pause, with the version they're based on. A newer version elsewhere shows "Changed elsewhere".
- Board size is capped at about 2 MB of data.
- Undo history (30 steps) is kept in the browser, restored after a reload only if the storm hasn't changed since, and cleared on sign-out.

**Items**
- Every item has x, y, z (stacking order), width, height and an optional parent (group or frame). Rotation is reserved in the data for v2.
- Resize: corner handles keep proportions, edge handles stretch; Shift inverts. Duplicate with Ctrl+D, Alt+drag, copy/paste (also between storms).
- Shapes: a click places a default size, a drag draws any size. Fill (white by default) with opacity, border colour, thickness, solid/dashed/dotted, corner radius.
- Text typed into a shape or sticky note is centred and auto-fits; the fitted font size is saved with the item, so loading needs no re-fitting.
- Sticky notes: preset colours, no border; square, resizable while square, or stretched to exactly 1×2 or 2×1.
- Text items: size, bold, italic, underline, colour, highlight, alignment, links, bulleted and numbered lists, about 10 free fonts. The box grows with the text until a width is set, then wraps. A text item on a shape stays independent and may overflow the shape.
- Fonts load before text is drawn; only the fonts a board uses are loaded.
- Images: upload, drag and drop, paste. Stored as WebP (max 2,560 px) with a 512 px preview, within the 5 MB upload cap; tell the user when an image was resized. PNG transparency is kept. The preview is drawn unless the image appears larger on screen. Any future download converts the image to PNG or JPG.
- Colour palette: our own presets derived from the app palette (yellow, orange, red, pink, purple, light and dark blue, light and dark green, brown, black, white), plus custom colours the user can add and remove, saved per user.
- Frames: a titled area; items fully inside move with it. No nesting.

**Layers and menu**
- New items go on top. Bring forward, to front, backward, to back (PgUp/PgDn, Shift for one step).
- Clicking the visible part of a covered item selects it; where items overlap, the top one wins. Items on a shape aren't contained by it.
- Right-click menu: copy, paste, duplicate, delete, arrange, lock/unlock, group/ungroup, copy/paste style.
- A floating toolbar above the selection holds all style options.

**Selection, groups, locks**
- Shift+click adds or removes items; the selection box selects only items fully inside it; Ctrl+A selects all.
- Resizing a selection scales everything in it. An auto-arrange button tidies a selection into a grid with equal gaps.
- Ctrl+G / Ctrl+Shift+G. A click selects the group, a double-click selects inside it. Groups can be nested. Resizing a group scales its contents in proportion.
- A locked item can't be moved, resized, deleted or edited; it can still be selected to unlock; a lock icon shows on hover or selection; it stays put when a selection around it moves.

**Connectors**
- 4 side dots on hover or selection; drag to another item to connect. Dropping on any point of an item attaches to that exact spot.
- Any item (images and groups included) can be connected; ends can also be loose on the canvas.
- Arrows follow moved items and keep their anchor. Deleting an item deletes its arrows.
- Straight, elbow and curved, with draggable midpoints. Thickness, solid/dashed/dotted, colour, arrowheads (start, end, both, none), reverse direction.

**Snapping and keys**
- Guides and snapping to nearby on-screen items: edges, centres, equal gaps, equal width and height. Applies to single items, selections and groups.
- Hold Alt to turn snapping off. No snapping to the grid.
- Arrow keys move 1px, Shift + arrow 10px.
- A keyboard shortcut list, mostly following Miro.

## UX notes and assets

**Main flow:** create a storm in the tree → place stickies and shapes from the toolbar → type into them → arrange with guides → connect with arrows → group or frame sections → leave; it's saved.

**Edge cases worth naming:**
- Dragging that starts on a big shape moves the shape, not the items on it; frames are the answer for areas.
- A locked item inside a moved selection stays put.
- Deleting an item removes its arrows.
- A large image is accepted but shrunk, with a clear message.

**Assets:** `../assets/Storms/` holds screenshots per feature (basic views, sticky notes, shapes, text, multiple items, connect items, emojis) and real boards (`complex examples/`, `Miro files & pdf exports/`). Visual style follows `DESIGN.md`.

**Palette, fonts and shortcuts:** proposals in `notes/storms/2026-10-10-storms-spike-5-palette-fonts-and-shortcuts.md`, to be finalised in a design pass.

## Risks

| Risk | How we'd notice | What we'd do |
|---|---|---|
| Scope is large for one release | Tasks keep slipping, or nothing is testable for a long time | Build in slices (canvas → items → layers and selection → connectors → snapping → frames), each usable on its own |
| Performance at 1,000 items | Pan/zoom stutters on a mid-range laptop | Canvas with culling and simplified drawing when zoomed out (spike: 60 fps at 2,000 items) |
| Rich text drawn on the canvas doesn't match the editor | Text jumps or shifts when editing starts or ends | One shared text-layout function for both; visual tests on enter/exit |
| Text auto-fit is fiddly | Text jumps or becomes unreadable in small shapes | Set a minimum font size; test with real board content |
| Storage cost from images | Storage per user grows fast | WebP plus previews (about 4× smaller on the spike sample); watch usage |
| Snapping and connectors feel wrong | Items jump unexpectedly; arrows reroute oddly | Keep thresholds small, Alt to disable; test against the real boards |

## Open questions

- Smoothness bar, proposed: pan and zoom on a 1,000-item board in Chrome with 4× CPU throttle keeps a median of at least 50 fps, with 95% of frames at or under 33 ms. Checked by an automated benchmark built from the spike harness, once Storms is built.
- Palette, fonts and shortcuts: proposed in `notes/storms/2026-10-10-storms-palette-fonts-and-shortcuts-research.md` (16 sticky colours, 10 fonts, Miro's shortcut letters); adjust during build.
- Tablet and mobile: analysed after desktop (a touch proposal is in the canvas note).
