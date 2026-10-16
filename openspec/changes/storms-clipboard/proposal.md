# Proposal

PRD: knowledge/prds/storms-v1.md @ f0bd215 (copy, paste and duplicate; shortcut list in `knowledge/notes/storms/2026-10-10-storms-spike-5-palette-fonts-and-shortcuts.md`)

## Why

In the 2026-10-16 test round the user found that Ctrl+C, Ctrl+V and Ctrl+D do nothing on the board. They expect them to work as in Miro. The PRD places copy, paste and duplicate in storms-arrange, but the user asked for them now. This change brings them forward for the one item that exists, the sticky.

## What Changes

**Copy, paste and duplicate a sticky**
- From: Ctrl+C, Ctrl+V and Ctrl+D do nothing on the board. Ctrl+D opens the browser's bookmark dialog.
- To:
  - Ctrl+C (⌘C) copies the selected sticky, with its text, colour and size.
  - Ctrl+V (⌘V) pastes a copy where the mouse pointer is on the board, or at the centre of the view if the pointer isn't on it. It works in the same Storm, in another Storm, and in another tab.
  - Ctrl+D (⌘D) duplicates the selected sticky right next to it, without the bookmark dialog.
  - Each paste or duplicate is one undo step, and the new sticky ends up on top and selected.
- Pasting plain text copied from elsewhere creates a new sticky with that text, in the colour for new stickies, cut to 500 characters.
- While typing in a sticky, the shortcuts work on the text as usual.
- Impact: non-breaking.

**Deferred** (storms-arrange): cut (Ctrl+X), copying several items, Alt+drag to duplicate, the right-click menu, copy and paste style.

**Decisions made without the user** (they asked to proceed on their own; each is recorded in `design.md`): paste at the pointer; duplicate to the right with a 20 px gap; plain text becomes a sticky; cut deferred.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `storm-board` (introduced by `storms-canvas`): new requirement "Copy, paste and duplicate".

## Impact

- **Code**: `src/components/storms/engine/input.ts` (key routing, plus copy and paste events while the board has focus); `engine/actions.ts` (`pasteSticky`, `duplicateSelected`); new `src/lib/storms/clipboard.ts` (pure: serialise, parse and validate a copied sticky; place a copy).
- **Data**: none. Copies are ordinary new stickies saved through change sets.
- **Dependencies**: none.
- **Order**: builds on `storms-sticky-style` (colour, size and the colour for new stickies). Archive it after `storms-canvas` and `storms-sticky-style`.
