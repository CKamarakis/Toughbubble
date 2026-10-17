# Design

## Context

Builds on `storms-canvas` (code on `feat/storms-canvas`, archived before this change). Relevant code today:
- `src/lib/storms/model.ts`: `Sticky = { id, type, x, y, z, w, h, text, parentId?, rotation? }`; `STICKY = { size: 200, fill: "#F7D000", text: "#333129", fontPx: 20, padding: 16 }`; `StormBody.schema = 1`.
- `src/lib/storms/text-layout.ts`: `wrapText(measure, text, maxWidth)` (textarea-compatible wrapping) and `layoutSticky(measure, s)` at the fixed `STICKY.fontPx`, line height ×1.3, vertically centred, clipped to whole lines.
- `src/lib/storms/validate.ts`: `ALLOWED` item keys; unknown keys rejected.
- `engine/renderer.ts`: caches layout per `w|h|text`; sets the text font once per frame ("changing the font per sticky is slow"); fills every sticky with `STICKY.fill` and draws text in `STICKY.text`.
- `sticky-text-overlay.tsx`: textarea at `STICKY.fontPx * zoom`, measured with the same font; scrolls with the caret and resets to the top on finish.
- `engine/store.ts`: every edit is one `commit(changeSet)`; `setText` clamps to `MAX_TEXT` (500).
- Reference: Miro's sticky toolbar ("Aa Auto" size, colour swatch grid; `knowledge/assets/storms/sticky notes basics/Sticky note - change color.png`). Palette proposal: `knowledge/notes/storms/2026-10-10-storms-spike-5-palette-fonts-and-shortcuts.md`.

## Goals / Non-Goals

**Goals:** sticky text auto-fits (8–64 px) with the fitted size stored; 13 preset sticky colours, chosen before placing or on a selected sticky, the last one remembered for new stickies with readable text; a sticky toolbar above the selected sticky with a Colour button; one undo step per colour change; the speed gate still passes.

**Non-Goals:** manual font size, custom colours, rich text, other item types, resize (all storms-items).

## Decisions

The user asked to proceed without them; these decisions were made on their behalf and are listed for review.

### D1: Data — optional fields on schema 1
`Sticky` gains `color?: string` (one of the preset hex values, upper case) and `fontSize?: number` (whole board px, 8–64). Both optional: absent colour = Yellow; absent size = fitted when drawn. No schema bump: storms-items still owns the move to rich text and `schema: 2`. `validate.ts` adds both keys to `ALLOWED`, checks `color ∈ PRESET_HEXES` and `fontSize` integer in [8, 64].
**Why presets only on the server:** custom colours are deferred; widening the check later is cheaper than cleaning stored junk.

### D2: Fit algorithm
`fitFontSize(measure, text, w, h): number` in `text-layout.ts`, pure and unit-tested: the largest integer `s` in [8, 64] for which `wrapText` at size `s` gives `lines × s × 1.3 ≤ h − 2·padding` and no line wider than `w − 2·padding` (`wrapText` already breaks long words by character). Binary search over the 57 sizes (≤ 6 wraps). Empty text → 64. `measure` takes a font size (measure at a 100 px reference font and scale linearly, so one canvas font setting serves every size; text width scales linearly with size for a given font, as `next/font` serves fixed outlines).
`layoutSticky` takes the size: `s.fontSize ?? fitted`. Padding stays 16 px.
**Alternatives:** CSS-style iterative shrink (slower, many wraps); fixed size buckets (visible jumps). Rejected.
**Decision (on the user's behalf):** range 8–64. 8 px keeps a full 500-character sticky mostly readable at 100%; 64 px matches Miro's large short text.

### D3: When the size is computed and stored
- While editing, each keystroke commits text and the new fitted size together (`store.setText` computes the size with the board's measure), so autosave stores both and the overlay renders at the same size: no jump.
- Stickies without `fontSize` (older boards, the speed bench) are fitted on first draw; the renderer caches the result per `w|h|text`. The commit path adds the fitted size to any upserted sticky that lacks one, so the size rides along on any change (a move, a nudge, a colour), not only on text; it adds no step and no save of its own. Opening a board writes nothing.
- Undo of a text edit restores the old text and the old size together (both are fields of the same item in the change set).

### D4: Drawing per-sticky sizes and colours
The renderer groups visible stickies by font size before drawing text (`ctx.font` set once per group, not per sticky) and draws fills and text colours per sticky. Colour lookup comes from `palette.ts`: `{ id, name, hex, ink }` for the 13 presets, `inkFor(hex)`; White gets a 1 px `#D9D8D3` (neutral 300) border. Text below 30% zoom is still skipped. Within a size group, text is drawn between overlaps so a sticky above another still hides the text below it (z-order is kept). While zooming, screen fonts are whole pixels; an exact redraw follows 150 ms after the zoom settles. Text is measured at a 100 px reference font and scaled.
**Speed:** the 1,000-sticky bench gives every sticky a random preset colour and no stored size, so it measures the worst case (fit-on-first-draw plus grouping). The gate (median ≥ 50 fps, p95 ≤ 33 ms) must still pass.

### D5: Palette (revised 2026-10-16 after the user's test)
The user removed Orange, Red, the pale Pink and Brown, and asked for a lighter yellow, a light blue, a purple, and a magenta and a pink close to the brand colours. 13 presets, by hue:

| Name | Hex | Text | Contrast | Why |
|---|---|---|---|---|
| Yellow | #F7D000 | #333129 | 8.7 | brand yellow (existing stickies) |
| Light yellow | #FFF0A0 | #333129 | 11.3 | brand yellow hue, lighter |
| Pink | #FFC6E8 | #333129 | 9.0 | brand magenta hue (≈320°), light tint |
| Magenta | #FF8AD8 | #333129 | 6.1 | brand magenta hue, strong tint |
| Lavender | #F3DDFF | #333129 | 10.3 | the first palette's "Purple", renamed |
| Purple | #D3A1FF | #333129 | 6.3 | brand purple hue (≈275°), strong tint |
| Sky blue | #BBF0FF | #333129 | 10.6 | the first palette's "Light blue", renamed |
| Light blue | #B3CEFF | #333129 | 8.2 | a true light blue between Sky and Dark blue |
| Dark blue | #3263C3 | #FFFFFF | 5.7 | |
| Light green | #D4F3C4 | #333129 | 10.8 | |
| Dark green | #008135 | #FFFFFF | 5.0 | |
| Black | #141310 | #FFFFFF | 18.6 | |
| White | #FFFFFF | #333129 | 13.0 | |

Contrast is the WCAG ratio of text on the colour (computed; a unit test asserts ≥ 4.5 for every pair). Strong tints keep dark text rather than white: white on #FF8AD8 or #D3A1FF is only about 2:1.
**Removed colours** stored by the first palette map to the nearest preset when a board enters the store (the same place long text is clamped): Orange #FFDEB9 → Light yellow, Red #FFD7CF → Pink, Pink #FFD5EE → Pink, Brown #E7CBB9 → Light yellow. The mapping writes nothing on open; the mapped colour is saved with the sticky's next change (whole-item upserts). The server accepts only the 13 presets.
**Decisions (on the user's behalf):** 13 colours (the user's list gives 8 kept + 5 new); the two existing pale colours stay under clearer names; grids show 4 per row (toolbar palette) and 2 per row (Sticky tool palette, like Miro), with White and Black last.

### D6: Sticky toolbar
- `sticky-toolbar.tsx`: an HTML element inside the board's light scope, positioned from the selected sticky's screen rect (`boardToScreen`), centred above it with an 8 px gap, flipped below when it would leave the top of the board, clamped inside the board horizontally. It subscribes to the engine store (`useSyncExternalStore`); hidden when the selection isn't exactly one sticky, while `editingId` is set, during an item drag or a pan (a `panning` flag in the store, set for the duration of a pan drag), and it repositions when the board is resized.
- Colour button (round swatch of the current colour, `aria-label="Colour: <name>"`, `aria-haspopup`) opens a popover grid (`role="radiogroup"`, swatches `role="radio"` with `aria-checked` and the colour name; arrow keys move, Enter/Space picks, Esc closes and returns focus to the button). A custom popover inside the toolbar, not the shadcn/Base UI `Popover`: its portal leaves the board's light scope and swallows wheel zoom. While the palette is open it also takes the arrow keys, Home, End, Enter and Space even when focus is still on the board (a mouse open): the first such key moves focus to the current swatch, then it behaves as the keyboard path. Delete, Backspace, N and undo/redo keys do not reach the board, and Esc closes the palette without changing the active tool.
- Pointer and key events on the toolbar don't reach the board (`stopPropagation`), so clicking it doesn't deselect or start a pan; wheel over it still zooms the board (as the zoom control does).
- Store action `setColor(id, hex)`: one `commit` with history (one undo step); no-op if unchanged.
**Decision (on the user's behalf):** hidden while typing or dragging (Miro keeps it while typing; ours would cover the text overlay's top lines on small stickies).

### D8: Colour on creation (added 2026-10-16)
- **Remembered colour:** `creation-color.ts` keeps the colour for new stickies in `localStorage` under `storm-sticky-color:<userId>` (per user in this browser, like the undo store's keying), wrapped in try/catch; missing, unreadable or non-preset → Yellow. The engine store holds it as `creationColor`; `placeSticky` uses it. Picking a colour in either palette (`setColor` from the sticky toolbar, or the Sticky tool's palette) updates it and writes it.
- **Sticky tool palette:** `sticky-tool-palette.tsx`, anchored above the Sticky button in the bottom toolbar, inside the board's light scope. It opens whenever the Sticky tool turns on (button or N) and closes when the tool turns off, a sticky is placed, or on Esc. It reuses the swatch grid from the sticky toolbar (extracted into one `ColorGrid` component: radiogroup, roving focus, arrows/Home/End, Enter/Space, Esc), 2 per row. Picking keeps the tool on; focus returns to the board so the next click places.
- Placing a sticky is still one undo step; picking the creation colour is not an undo step (it changes no board item).
**Decision (on the user's behalf):** the toolbar recolour also sets the creation colour, so "the last colour I picked" means either palette; per user per browser, not synced across devices (no server setting exists for Storms yet).

### D7: Verification
- Unit: `fitFontSize` (short text → 64, growing text shrinks monotonically, 500 chars → ≥ 8, empty → 64, long word breaks), `layoutSticky` with stored and missing size, palette contrast ≥ 4.5 for every pair, `validate` (preset accepted, other hex rejected, size 7/65/12.5 rejected, missing fields accepted), store `setColor` (one history step, undo restores), `setText` stores text + size together.
- DOM: overlay font size equals the fitted size while typing; toolbar shows for one selected sticky, hides while editing/dragging, keyboard path picks a colour and returns focus.
- Renderer test: fill and text colour per preset, white border, text grouped by size.
- Integration (`storm-board.test.ts`): a save with `color` and `fontSize` round-trips; an unknown colour is refused.
- Speed gate with the coloured, unsized bench board.
- Testing plan steps appended to `openspec/changes/storms-sticky-style/testing-plan.md` for the user.

## Risks / Trade-offs

- [Linear width scaling is not exact for every font (hinting at small sizes)] → measure at a 100 px reference; a ±1 px error at 8 px is invisible; the overlay uses the same measure, so canvas and editor agree.
- [Fit-on-first-draw for 1,000 unsized stickies could stall the first frame] → cached per `w|h|text`; bench covers it; if slow, fit lazily only for visible stickies (already culled).
- [Toolbar can overlap neighbouring stickies] → acceptable; it's transient and hides on deselect.
- [Server rejects any non-preset colour] → custom colours (storms-items) must widen the check; noted there.

## Migration Plan

No database change. Old boards load unchanged (no colour → yellow, no size → fitted). Rollback: a revert; stickies saved meanwhile carry `color`/`fontSize`, which the old validator rejects on the next save of that sticky — so roll back only together with clearing those fields, or roll forward.

## Open Questions

- None blocking. For the user to confirm after the build: the 8–64 px range, the palette, and hiding the toolbar while typing.
