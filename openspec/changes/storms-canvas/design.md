# Design

## Context

First of five Storms v1 slices (PRD `knowledge/prds/storms-v1.md`; slice order canvas → items → arrange → connectors → snapping, per `openspec/config.yaml`). The PRD's Risks table lists six with frames last; frames are folded into storms-items here. Agreed in `brainstorm.md`. Evidence: spike notes in `knowledge/notes/storms/` (rendering benchmark, data/images/undo).

The relevant code today:
- `storm` is already an item kind (`src/db/schema.ts` `itemKind`); create, rename, move, nest, archive, trash and restore work through the tree.
- `item-view.tsx` shows a placeholder for storms: "The Storm canvas arrives in a later phase."
- `items/[id]/page.tsx` loads an active item (archived, trashed, missing and foreign all `notFound()`) and, for notes, the body via `getNoteBody`.
- `item_content` (`item_id`, `owner_id`, `body jsonb`, `version`) with owner-only RLS holds note bodies; `saveNoteBody` puts the version check in the UPDATE's WHERE.
- `src/lib/notes/autosave.ts` is a pure, tested autosave state machine (1 s pause, retries with backoff, conflict with Load latest / Keep mine). It has no note-specific code.
- Sign-out is a form post to `/auth/sign-out` from `account-menu.tsx`.
- App font: Geist via `next/font` (`--font-geist-sans`).
- No duplicate action exists anywhere yet.

## Goals / Non-Goals

**Goals:**
- A storm opens as an always-light, effectively unlimited board with zoom, pan, fit and a dot grid.
- A minimal plain-text sticky proves placing, selecting, moving, typing, deleting, saving and undo end to end.
- Saves are small change sets with a version check; "Changed elsewhere" across tabs; 2 MB board cap.
- 30 undo steps that survive a reload when the board is unchanged; wiped on sign-out.
- Duplicate a storm.
- 1,000 stickies pan and zoom smoothly (speed gate below).
- An engine shape later slices extend without restructuring.

**Non-Goals** (deferred, with owning slice):

| Deferred | Slice |
|---|---|
| Shapes, text items, images, frames; their toolbar tools | storms-items |
| Sticky colours, sizes (square, 1×2, 2×1), resize handles (HTML) | storms-items |
| Rich text in stickies (TipTap overlay), shrink-to-fit with stored font size, font palette | storms-items |
| Colour palette with per-user custom colours | storms-items |
| Right-click menu (copy, paste, duplicate, delete, arrange, lock, group, copy/paste style) | storms-arrange |
| Selection box, Shift+click, Ctrl+A, multi-move, auto-arrange | storms-arrange |
| Layer commands (forward, back, front, back-most; PgUp/PgDn) | storms-arrange |
| Groups, locking, floating style toolbar, copy/paste, Ctrl+D, Alt+drag duplicate | storms-arrange |
| Connector tool and arrows; deleting an item deletes its arrows | storms-connectors |
| Resizing a selection or group scales its contents | storms-arrange |
| Duplicating a storm copies its image attachments | storms-items |
| Guides, snapping, Alt to disable; keyboard shortcut list | storms-snapping |
| Acceptance: rebuild the three real Miro boards (PRD measure) | storms-snapping (last slice) |
| Duplicate for notes | later tree change |
| Full-screen board mode | later, if wanted |
| Tablet and touch | unassigned; after desktop |
| Screen-reader access to board content | unassigned; see Open Questions |

## Decisions

### D1: Engine core is framework-free; React is a thin shell
Plain TypeScript owns board, camera, selection, tool and history. React subscribes with `useSyncExternalStore` and renders only HTML controls (header status, toolbar, zoom control, text overlay). Pointer moves update the store and schedule a canvas redraw; they never re-render React.

**Alternatives:** board state in React (re-renders on every pointer move; risks the speed goal) and forking Excalidraw (text model and shapes don't fit; fork upkeep). Rejected, see `brainstorm.md`.

### D2: Units
Pure, unit-tested, no DOM (`src/lib/storms/`):
- `model.ts`: `StormBody = { schema: 1, items: Record<string, Item> }`. This slice's item: `{ id, type: "sticky", x, y, z, w, h, text }`; `parentId` and `rotation` reserved (optional, unused) per the PRD. Ids are `crypto.randomUUID()` from the client. `z` is a fractional-index key (`fractional-indexing`, already a dependency) compared as a string, so later layer commands change one item, not many; new items get `generateKeyBetween(maxZ, null)`. `text: string` is plain text; storms-items moves sticky text to rich content and bumps `schema` to 2 with a load-time upgrade.
- `changeset.ts`: `ChangeSet = { upsert: Item[]; delete: string[] }`; `apply`, `invert` (against the board before the change), `merge` (latest per id wins; upsert then delete = delete; delete then upsert = upsert). A merged set never has the same id in both lists.
- `camera.ts`: `{ x, y, zoom }`; screen↔board conversion, `zoomAt(point, factor)` clamped to 0.1–4, step list (10, 25, 50, 75, 100, 150, 200, 300, 400%), `fit(bounds, viewport, margin)` (empty board → 100% at origin), pan clamp.
- `history.ts`: undo and redo stacks of `{ do, undo }` change-set pairs, max 30; a new action clears redo.
- `hit-test.ts`: topmost item (highest `z`) containing a board point.
- `wheel-source.ts`: classifies a wheel event as mouse or trackpad (D5).
- `limits.ts`: `BOARD_LIMIT = 1_000_000` px; item fields must be finite and within it; `MAX_TEXT = 5_000` chars; `MAX_BODY_BYTES = 2 * 1024 * 1024`.
- `validate.ts`: server-side validation of change sets and items: unknown types and fields rejected; ids are UUIDs; no duplicate ids within `upsert` or within `delete`; no id in both; `w`, `h` > 0; at most 5,000 entries per list; serialized change set ≤ 800 KB (under Next's 1 MB Server Action cap, as notes do). Loaded bodies are checked for `schema: 1`.
- `operations.ts` / `actions.ts`: `isActiveStorm` (kind `storm`, status active, like `isActiveNote`), used by every operation; `getStormBody`, `getStormVersion`, `saveStormChanges`, `duplicateStorm`. Client-facing actions: `loadStorm`, `stormVersion`, `saveStorm`, `duplicateStorm`.

Shared: `src/lib/notes/autosave.ts` moves to `src/lib/autosave.ts` with its tests and gains one event and phase:
- `save-too-large` → phase `too-large`: no retries; the next `edit` returns to `dirty`. Notes never send it.
- Rule stated for both: on `save-error`, `save-conflict` or `save-too-large`, the in-flight payload merges back under pending (pending wins per id). Notes already resend the whole body, so this is a no-op for them.

Browser (`src/components/storms/`):
- `engine/store.ts`: state, `subscribe`, `getSnapshot`, actions (place, move, edit text, delete, select, tool, camera); every board edit goes through one `commit(changeSet)` that applies it, pushes history and marks autosave dirty.
- `engine/renderer.ts`: one `<canvas>` sized to the pane × `devicePixelRatio`; draws dot grid, visible stickies (culled against the viewport), text (skipped below 30% zoom), selection outline; redraws on `requestAnimationFrame` only when marked dirty.
- `engine/input.ts`: pointer, wheel and key events → tool actions (see D5).
- `storm-view.tsx` (slim header + board), `storm-board.tsx`, `storm-toolbar.tsx`, `zoom-control.tsx`, `sticky-text-overlay.tsx`, `use-storm-autosave.ts`, `undo-store.ts`, `view-store.ts`.

### D3: Saving with change sets
- Client keeps a pending change set (all commits merged since the last acknowledged save) and an in-flight one. The autosave machine (D2) drives timing: 1 s after the last edit, send `saveStormChanges(itemId, changeSet, baseVersion)`.
- Server: validate, then one UPDATE that merges in SQL and checks version and size together:
  `body = jsonb_set(body, '{items}', ((body->'items') - deleteIds) || upsertMap)` `WHERE item_id = $id AND version = $base AND octet_length(<merged>::text) <= MAX_BODY_BYTES`, bumping `version` and `items.edited_at`. Zero rows → read the stored version to tell conflict from too-big.
- First save of a never-saved storm (version 0) inserts `{ schema: 1, items: {} }` merged with the change set, `ON CONFLICT DO NOTHING`, after the same size check.
- Every operation first checks `isActiveStorm`; a note's id (or an archived or trashed storm) returns `not-found`, so a change set can never merge into a note body.
- Results: `saved` (new version), `conflict` (stored version), `too-large`, `not-found`, `error`. Server actions follow `notes/actions.ts` (UUID check, `withUserDb`, friendly errors).
- Conflict: "Changed elsewhere" with **Load latest** (reload body, drop pending and undo history) or **Keep mine** (resend pending based on the stored version; per-id last write wins, other items kept; on success reload the body and drop undo history, because this tab hasn't seen the other tab's items).
- Focus refresh (as notes do, `use-note-autosave.ts`): when the tab regains focus and nothing is pending, compare `stormVersion`; if newer, reload the body and drop undo history.
- Too large: message "This storm is too big to save. Remove some items."; pending kept; `too-large` phase until the next edit.
- Leaving with unsaved changes warns, as notes do.

**Why SQL merge over read-modify-write:** one round trip, the version check and size check are atomic, and the server never holds the whole board in memory per save.

### D4: Loading
- `items/[id]/page.tsx` loads `getStormBody` for storms as it does notes (body + version; empty body at version 0).
- `StormBoard` is loaded with `next/dynamic` and `ssr: false` inside the client component `storm-view.tsx` (Next 16 allows `ssr: false` only in Client Components: `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`), so the engine is only downloaded on storm pages.
- `next/font` registers Geist under a generated family name, so the board reads the real family from `getComputedStyle(board).getPropertyValue("--font-geist-sans")` and uses it for the canvas, `document.fonts.load` and the textarea overlay. Text waits for the font; stickies draw immediately.

### D5: Input map (desktop)
- Mouse wheel: zoom toward the pointer (PRD). Trackpad two-finger scroll: pan. Ctrl/⌘ + wheel and trackpad pinch (a wheel event with `ctrlKey`): zoom toward the pointer. Browsers send both mouse wheel and trackpad scroll as `wheel` events, so `wheel-source.ts` (pure, unit-tested) classifies them: horizontal delta, pixel `deltaMode` with small or fractional deltas → trackpad; line `deltaMode` or large whole-step deltas → mouse. The result is locked per gesture (until about 150 ms without wheel events) so it can't flip mid-scroll. The listener is attached with `addEventListener("wheel", h, { passive: false })`, not React's passive `onWheel`, so `preventDefault` stops the page itself zooming or scrolling. Safari trackpad pinch may arrive as `gesturestart`/`gesturechange` rather than ctrl + wheel: handle both (unverified until tested in Safari).
- Right-button drag: pan. `contextmenu` suppressed on the board. A right-click without drag does nothing in this slice.
- Space held + left drag: pan, hand cursor.
- Left click on item: select (and start drag if moved beyond 3 px). On empty board: deselect.
- Sticky tool (N) + click: place 200×200 sticky centred on the point, `z = maxZ + 1`, select it, return to Select (V).
- Double-click or Enter on selected sticky: edit text. Esc or click outside: finish. Each keystroke commits the text to the board (so autosave covers an unfinished edit and nothing is lost on a crash) without adding history; finishing adds one undo step from the text before editing to the text after.
- Delete / Backspace on selection (not editing): delete.
- Arrow keys: 1 px, Shift: 10 px; consecutive nudges within 1 s merge into one undo step.
- Ctrl/⌘+Z, Ctrl/⌘+Shift+Z (and Ctrl+Y): undo/redo. Ctrl/⌘ + = / − : zoom step; Ctrl/⌘ + 0: 100%; Shift+1: fit (matched on `e.code === "Digit1"`, since `e.key` is "!"). Keys apply only while focus is on the board.
- Pointer events throughout, so touch can be added later without rewriting.

### D6: Sticky v0 rendering
Yellow `#F7D000` fill, no border, subtle shadow; text neutral 800 (`#333129`), Geist 20 px, centred both ways, wrapped to the sticky width with padding, clipped when overflowing. The same wrap function positions the `<textarea>` overlay so text doesn't jump between viewing and editing. Selection: 2 px magenta `#F700A8` outline drawn on canvas (HTML handles come with resize in storms-items).

### D7: Undo across reload
- `undo-store.ts` writes `{ version, undo, redo }` to IndexedDB (database `storms-undo`, key `<userId>:<stormId>`) after an acknowledged save, and only when nothing is pending or in flight, so the snapshot always matches the board stored at `version`. Steps made during a save are written at the next quiet save.
- On load: restore only if the stored `version` equals the server version; otherwise delete it.
- Sign-out: the account menu clears the object store (`store.clear()`, not `deleteDatabase`, which other open tabs would block) before submitting the sign-out form. Open connections close on `versionchange`. Keying by user id means another user on the same browser never sees it even if clearing fails.
- Zoom, pan and selection are not undo steps.

### D8: Last view per storm
`view-store.ts` keeps `{ x, y, zoom }` in `localStorage` under `storm-view:<stormId>`, written on idle after camera changes; wrapped in try/catch, falling back to 100% at origin.

### D9: Always-light board
The board container has a `light` class that sets the light design tokens locally, and the dark variant in `globals.css` becomes `@custom-variant dark (&:is(.dark *):not(.light *))`, so shared components with `dark:` classes stay light inside the board. Header and sidebar follow the theme. Toolbar and zoom control sit inside the board and stay light.

### D10: Duplicate storm
`duplicateStorm(id)` in one user transaction, after `isActiveStorm`:
- Title "<title> (copy)", truncated so it stays within `MAX_TITLE` (200).
- Placed directly below the original in the sidebar: the sibling group is re-keyed in its current visible order with the copy inserted after the original, the same way `reorderGroup` does. Needed because never-reordered groups all share position `a0` and sort newest first, which would put the copy above.
- The `item_content` body is copied with version 1; a never-saved storm has no row, so the copy has none either (it opens empty at version 0). "Duplicate" appears in the item menu for storms only; after success the app navigates to the copy and the tree refreshes.

### D11: Verification
- Unit (Vitest): camera (zoom-at keeps the point under the cursor, clamp, steps, fit, empty fit), change sets (apply/invert/merge, never an id in both lists), history (cap, redo cleared), hit-test (topmost wins by fractional `z`), wheel classification (per-gesture lock), limits and validation (bad and duplicate ids, id in both lists, unknown types, NaN, out-of-range, `w`/`h` ≤ 0, long text, too many entries, over 800 KB), autosave (existing tests after the move, plus `too-large` and the in-flight → pending merge).
- Integration (existing `test:integration` setup): save with matching version; stale version → conflict; too large → `too-large` and nothing stored (first save too); another user's storm → not-found; a note's id → not-found and the note body unchanged; duplicate copies all stickies, lands directly below the original in a never-reordered group, truncates a long title, and copies an unsaved storm as empty.
- Speed gate: `scripts/storms-bench.mjs` with Playwright (dev dependency) opens a dev-only route that loads a synthetic 1,000-sticky board without saving (`notFound()` in production), applies 4× CPU throttle, pans and zooms; fails unless median ≥ 50 fps and p95 frame ≤ 33 ms.
- Requirement → test: each spec scenario names its test; `/kit:verify` lists any without one.
- Manual checklist for the user (handed over at build end): place, type, move, delete; wheel zoom toward a sticky, fit, 100%; three pans and no browser menu; reload keeps stickies, view and undo; two tabs → "Changed elsewhere"; dark app theme keeps board light; duplicate has the same stickies.

## Risks / Trade-offs

- [Mouse wheel vs trackpad scroll can't be told apart perfectly; some mice with smooth scrolling may pan instead of zoom] → heuristic with unit tests; Ctrl + wheel always zooms; tune with the user's devices during manual checks.
- [Plain textarea overlay vs canvas text differ slightly] → one shared wrap function and the same font metrics; storms-items replaces both with the TipTap path anyway.
- [Canvas content is invisible to screen readers] → labelled toolbar and zoom buttons; flagged as an open question.
- [Merging pending changes on Keep mine overwrites the other tab's edits to the same sticky] → acceptable for a single user; same rule as notes (mine wins).
- [Speed gate machine-dependent] → same throttled setup as spike 1; bar confirmed with the user after the first run.
- [SQL size check uses text length, not stored size] → it is the conservative measure of what the client loads; fine for a cap.
- [Moving `autosave.ts` and adding `too-large` touches notes] → existing tests keep passing; notes never send the new event.
- [Changing the dark variant in `globals.css` affects the whole app] → only adds `:not(.light *)`; nothing outside the board uses `.light`; theme contrast test still runs.
- [Pending changes after a long offline spell exceed the 800 KB save cap] → the client splits a pending set over 800 KB into several saves in order, each based on the previous result.

## Migration Plan

No schema change: storms use the existing `item_content` table and `storm` kind. Deploy as usual; rollback is a revert (storm bodies saved meanwhile stay valid for the next deploy).

## Open Questions

- Screen-reader access to board content: not in the PRD; propose a later change.
- Speed bar: the PRD's proposal; confirm after the first benchmark run.
- Tablet and touch: unassigned, after desktop.
