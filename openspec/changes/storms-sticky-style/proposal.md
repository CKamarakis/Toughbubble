# Proposal

PRD: knowledge/prds/storms-v1.md @ f0bd215 (sticky lines 85, 86, 90; Risks "Text auto-fit is fiddly")

## Why

In the 2026-10-16 test round the user found sticky text hard to use: long text is cut off at one fixed size, and every sticky is yellow. Miro, the reference, fits text to the sticky and lets you pick its colour from a small toolbar. The user asked for both now, ahead of the rest of storms-items.

## What Changes

**Sticky text fits the sticky**
- From: plain text at one fixed size (20 px); text that doesn't fit is clipped.
- To: the text is drawn at the largest size that fits the sticky, from 8 px up to 64 px, so short text is big and long text gets smaller. Only text that doesn't fit even at 8 px is clipped. The size updates while typing, and the editor shows the same size, so the text doesn't jump.
- The fitted size is saved with the sticky, so opening a board needs no fitting.
- Impact: non-breaking. Stickies saved before this change have no stored size; they are fitted when drawn and saved with a size the next time they change.

**Sticky colour**
- From: every sticky is yellow.
- To: when one sticky is selected, a small toolbar appears above it with a colour button. It opens a palette of 12 preset colours: yellow (the current default), orange, red, pink, purple, light blue, dark blue, light green, dark green, brown, black and white. Picking one recolours the sticky in one undo step. The text is dark on light colours and white on dark ones.
- New stickies stay yellow.
- Impact: non-breaking.

**Deferred** (stay in storms-items): a manual font size next to "Auto", custom colours saved per user, new stickies remembering the last colour, colours for other item types, the full floating style toolbar (fonts, bold, links, alignment).

**Decisions made without the user** (they asked to proceed on their own; each is recorded in `design.md`): size range 8–64 px; 12 PRD presets instead of Miro's 16; toolbar hidden while typing or dragging; new stickies stay yellow.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `storm-board` (introduced by `storms-canvas`, which is archived before this change):
  - Type in a sticky: text auto-fits instead of one fixed size.
  - New requirement: Sticky colour (palette, text contrast, undo).
  - New requirement: Sticky toolbar (above the selected sticky).
- `storm-saving`: Server checks accept a sticky's colour and fitted size and reject invalid ones.

## Impact

- **Code**:
  - `src/lib/storms/`: model gains optional `color` and `fontSize`; `text-layout.ts` gains the fit; `validate.ts`; new `palette.ts`.
  - `src/components/storms/`: renderer (per-sticky fill, text colour and size), text overlay (fitted size), engine store actions (`setColor`), a new `sticky-toolbar.tsx`.
- **Data**: no schema change. Board JSON stays `schema: 1`, and both fields are optional, so existing boards load as they are.
- **Dependencies**: none new.
- **Speed**: per-sticky font sizes make drawing text a little slower. The 1,000-sticky speed gate must still pass.
- **Order**: requires `storms-canvas` to be archived first, because this change modifies its `storm-board` and `storm-saving` specs.
