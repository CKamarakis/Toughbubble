# Design

## Context

- Board keys go through `routeKey(snapshot, e)` in `src/components/storms/engine/input.ts`. It returns `null` while `editingId` is set, so the textarea overlay keeps its own native copy and paste. The board's keydown listener sits on the board element (`boxRef`), which has focus while the board is in use.
- Board edits go through the store's single `commit` path: one undo step per call, autosaved as change sets, with the fitted size added to stickies that lack one (storms-sticky-style).
- `placeSticky(store, at)` in `engine/actions.ts` places a 200×200 sticky centred on a board point at `topZ`, selects it, and uses the store's `creationColor` (storms-sticky-style D8).
- Clipboard API: a `copy` event lets the page set its own data types through `clipboardData.setData`. Custom MIME types survive a paste within the same browser across tabs. A `paste` event exposes `clipboardData` with no permission prompt. `navigator.clipboard.read` would need a permission and doesn't carry custom types in Firefox.

## Goals / Non-Goals

**Goals:** copy, paste and duplicate of the selected sticky; paste across Storms and tabs; plain text pastes as a sticky; one undo step each; no bookmark dialog.

**Non-Goals:** cut; several items; Alt+drag; context menu; copy and paste of style. All of these belong to storms-arrange.

## Decisions

The user asked to proceed without them. These decisions were made on their behalf.

### D1: Clipboard through copy/paste events
- **Listening:** while the board has focus (`document.activeElement` is inside the board and nothing is being edited), the board listens for `copy` and `paste` on `document`. Ctrl/⌘ + C and V are not routed through `routeKey`, so the browser fires the events.
- **Copy:** with a sticky selected, the board calls `preventDefault` and writes two types:
  - `text/plain`: the sticky's text, so pasting into another app gives the words.
  - `application/x-toughbubble-sticky+json`: `{ v: 1, sticky: { text, color?, fontSize?, w, h } }`. There is no id or position in it.
- **Paste:**
  - If the custom type is present and `parseCopiedSticky` accepts it (shape, preset colour, size 8–64, text ≤ 500, `w`/`h` within limits), the board pastes that sticky.
  - Otherwise, if `text/plain` is not empty, it makes a new sticky with the first 500 characters, in `creationColor`.
  - Otherwise nothing happens.
  - A paste is `preventDefault`ed only when it does something.
- **Why events, not `navigator.clipboard`:** no permission prompt, custom types work across tabs in Chromium and Firefox, and the text editor's native copy is untouched.

### D2: Where pasted and duplicated stickies go
- **Paste:** centred on the last pointer position over the board, converted to board coordinates with the current camera. The input layer already tracks pointer moves. If the pointer left the board or never entered it, the copy goes at the view's centre. The position is clamped within `BOARD_LIMIT`.
- **Duplicate:** `x = original.x + original.w + 20`, same `y`, then clamped.
- **Both:** a new id, `z = topZ`, the copied text, colour, size and dimensions. One `commit` (one undo step). The new sticky is selected and the tool is set to the default.
- **Repeated pastes** at the same pointer stack exactly on top of each other. This is accepted; Miro does the same at the cursor.

### D3: Ctrl/⌘ + D
`routeKey` maps a plain Ctrl/⌘ + D (no Shift or Alt) with a sticky selected to `"duplicate"`. The board's keydown handler calls `preventDefault`, so the browser's bookmark shortcut doesn't fire while the board has focus. With nothing selected it returns `null` and the browser's default applies. This is accepted: the board can't own Ctrl+D with nothing to duplicate.

### D4: Units
- `src/lib/storms/clipboard.ts` (pure, unit-tested): `serializeSticky(s)`, `parseCopiedSticky(json): CopiedSticky | null`, `stickyFromText(text, color)`, `placeCopy(copied, centre, items): Sticky`.
- `engine/actions.ts`: `pasteSticky(store, copied, at)`, `duplicateSelected(store)`.
- `engine/input.ts`: the document `copy` and `paste` listeners added on attach and removed on detach, gated on board focus; the `"duplicate"` route.

### D5: Verification
- **Unit:**
  - Serialise/parse round trip.
  - Parse rejects a bad colour, a size of 7, 501 characters, NaN and an unknown version.
  - Text-to-sticky clamps to 500.
  - `placeCopy` centres the copy and clamps it to the limit.
  - `routeKey` sends Ctrl+D to duplicate only when a sticky is selected and nothing is being edited.
- **DOM** (`input.dom.test.ts`, with synthetic `copy` and `paste` events carrying a `DataTransfer`):
  - Copy sets both types.
  - Paste of the custom type places a copy at the pointer.
  - Paste of plain text makes a sticky in the creation colour.
  - Ctrl+D duplicates 20 px to the right with one undo step.
  - While editing, the copy and paste events are not intercepted.
  - With nothing selected, copy does nothing.
- **Browser** (testing plan): paste into another Storm and another tab; the bookmark dialog doesn't open.

## Risks / Trade-offs

- [Safari may drop custom clipboard types] → the paste falls back to the plain text, so it becomes a sticky with the same text and the default colour. This needs a check in Safari during testing.
- [A board without focus doesn't receive keys] → the existing behaviour: clicking the board focuses it.
- [Ctrl+D with nothing selected still opens bookmarks] → accepted (D3).

## Migration Plan

None. This change adds no new data.

## Open Questions

- None blocking. After the build, the user should confirm the paste position (at the pointer) and the duplicate offset (right, 20 px).
