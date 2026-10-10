# Tasks

## 1. Shared autosave

- [x] 1.1 Move `src/lib/notes/autosave.ts` and its tests to `src/lib/autosave.ts`; update the notes imports. Verify that the existing autosave and notes tests pass unchanged.
- [x] 1.2 Add the `save-too-large` event and `too-large` phase, and the in-flight → pending merge rule, per D2. Verify that unit tests cover: no retries in `too-large`, the next edit returns to `dirty`, and notes behaviour is unchanged.

## 2. Board core (pure, unit-tested)

- [x] 2.1 `src/lib/storms/model.ts` and `limits.ts` per D2: `StormBody`, the sticky item, fractional `z`, `BOARD_LIMIT`, `MAX_TEXT`, `MAX_BODY_BYTES`. Verify that types compile and new `z` keys sort above all existing ones.
- [x] 2.2 `changeset.ts`: apply, invert, merge. Verify that unit tests cover: apply then invert restores the board, merge keeps the latest per id, upsert then delete = delete, delete then upsert = upsert, and never an id in both lists.
- [x] 2.3 `camera.ts`: screen↔board, `zoomAt`, clamp, steps, fit, pan clamp. Verify that unit tests cover: the point under the cursor stays put, 10%/400% limits, the step list, fit of spread items, empty fit → 100% at origin, ±1,000,000 px clamp.
- [x] 2.4 `history.ts`: 30-step undo/redo of change-set pairs. Verify that unit tests cover the cap and redo cleared by a new change.
- [x] 2.5 `hit-test.ts`: topmost by fractional `z`. Verify with unit tests of overlapping stickies.
- [x] 2.6 `wheel-source.ts` per D5, with the per-gesture lock. Verify that unit tests cover mouse line steps, trackpad pixel deltas, horizontal deltas, ctrl (pinch) and no flip mid-gesture.
- [x] 2.7 `validate.ts` per D2 and the "Server checks" requirement. Verify that unit tests reject each malformed case (bad and duplicate ids, id in both lists, unknown types or fields, NaN, out of range, `w`/`h` ≤ 0, text over 5,000, over 5,000 entries, over 800 KB) and accept a valid set.

## 3. Server: load, save, duplicate

- [x] 3.1 `operations.ts`: `isActiveStorm`, `getStormBody`, `getStormVersion`, `saveStormChanges` with the single SQL merge, version and size check (D3), first-save insert with the size check, and `items.edited_at` touch. Verify with integration tests: matching version saves; stale version → conflict; too large → `too-large` with nothing stored (first save too); another user's storm → not-found; a note's id → not-found with the note body unchanged.
- [x] 3.2 `actions.ts`: `loadStorm`, `stormVersion`, `saveStorm` following `notes/actions.ts` (UUID check, validation, friendly errors). Verify that invalid input returns the error result without touching the database.
- [x] 3.3 `duplicateStorm` per D10 (title truncation, re-keyed placement, body copy, unsaved → empty). Verify with integration tests: three stickies copied; copy listed directly below the original in a never-reordered group; long title ends in " (copy)" within 200; unsaved storm copies as empty; editing the copy leaves the original unchanged.
- [x] 3.4 Add Duplicate to the item menu for Storms only; navigate to the copy and refresh the tree. Verify in the browser that a Storm's menu shows Rename, Duplicate, Move to…, Reorder, Archive, Move to Trash, and that folder and note menus have no Duplicate.

## 4. Storm page and always-light board

- [ ] 4.1 Load the storm body in `items/[id]/page.tsx`; render `storm-view.tsx` (slim header) from `item-view.tsx` with `StormBoard` via `next/dynamic` `ssr: false` in the client component (D4; read `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` first). Verify in the browser that a Storm opens with the header and a full-pane board, and that opening a note doesn't download the board chunk (network tab).
- [ ] 4.2 Light scope per D9: `.light` on the board and the `globals.css` dark variant `&:is(.dark *):not(.light *)`. Verify that the theme contrast test passes and, in the browser with the dark theme, the sidebar and header are dark while the board, toolbar and zoom control are light.

## 5. Engine: store, renderer, input

- [ ] 5.1 `engine/store.ts` with `subscribe`/`getSnapshot` and a single `commit(changeSet)` path into history and autosave (D2). Verify with unit tests that commit applies, records history, and marks dirty; and that camera changes don't touch history.
- [ ] 5.2 `engine/renderer.ts`: DPR-sized canvas, dot grid fading out, culled stickies, text skipped below 30%, selection outline, redraw on rAF only when dirty, text waits for the resolved Geist family (D4, D6). Verify in the browser: sharp on a high-DPI screen, grid gone at 10%, no fallback-font flash on reload.
- [ ] 5.3 `engine/input.ts`: non-passive wheel listener, mouse vs trackpad, ctrl/pinch zoom, Safari gesture events, right-drag and Space-drag pan, suppressed context menu, zoom keys including Shift+1 by `e.code` (D5). Verify in the browser: wheel zooms toward the pointer, trackpad pans, pinch zooms, the page never zooms, right-drag pans with no browser menu, Space shows a hand.

## 6. Toolbar, zoom control, last view

- [ ] 6.1 `storm-toolbar.tsx`: Select (V), Sticky (N), Undo, Redo with tooltips, labels, and disabled states. Verify in the browser that only these four tools show and Undo/Redo are unavailable on a fresh board.
- [ ] 6.2 `zoom-control.tsx`: −, %, +, fit; click % → 100%. Verify in the browser: + from 100% gives 150%, fit shows all stickies, fit on an empty board gives 100% at the centre.
- [ ] 6.3 `view-store.ts`: last view per storm in `localStorage`, try/catch fallback (D8). Verify in the browser that a Storm reopens at the zoom and position it was left at, and a first open is 100% at the centre.

## 7. Stickies

- [ ] 7.1 Place with the Sticky tool (200×200, yellow, on top, selected, back to Select; within the board limit). Verify in the browser per the "Place a sticky" scenarios.
- [ ] 7.2 Select (magenta outline, topmost wins), deselect on empty board, drag to move, arrow / Shift+arrow nudges merged within 1 s. Verify in the browser per the "Select and move stickies" scenarios.
- [ ] 7.3 `sticky-text-overlay.tsx`: double-click or Enter to edit, Esc or click outside to finish, per-keystroke commits without history and one undo step per session, shared wrap function, clipped overflow, 5,000-character limit (D5, D6). Verify in the browser that text doesn't shift when editing starts or ends and that overflow is clipped with the full text kept.
- [ ] 7.4 Delete / Backspace on a selected sticky, not while editing. Verify in the browser per the "Delete a sticky" scenarios.

## 8. Saving and undo in the browser

- [ ] 8.1 `use-storm-autosave.ts`: pending and in-flight change sets, 1 s pause, "Saving…" / "Saved" / "Couldn't save — retrying", leave warning, splitting sets over 800 KB, too-large message (D3). Verify in the browser: a reload shows saved stickies; offline keeps work and saves on reconnect; the leave warning appears while pending.
- [ ] 8.2 Changed elsewhere: Load latest, Keep mine (then reload body and drop undo), refresh on focus (D3). Verify in the browser with two tabs per the "Changed elsewhere" scenarios.
- [ ] 8.3 Undo/redo keys and buttons through the store; zoom, pan and select are not steps. Verify in the browser per the "Undo and redo" scenarios.
- [ ] 8.4 `undo-store.ts` in IndexedDB: write only when nothing is pending or in flight, restore only on a matching version, keyed by user and storm; `account-menu.tsx` clears the store before sign-out (D7). Verify in the browser: reload keeps undo; a change in another tab drops it; sign out and in again leaves Undo unavailable.

## 9. Speed gate

- [ ] 9.1 Add Playwright as a dev dependency, a dev-only route that loads a synthetic 1,000-sticky board without saving (`notFound()` in production), and `scripts/storms-bench.mjs` (4× CPU throttle, pan and zoom, median fps and p95 frame time) per D11. Verify that the script passes (median ≥ 50 fps, p95 ≤ 33 ms) and report the numbers to the user to confirm the bar.

## 10. Docs and release

- [ ] 10.1 Update the README with Storms (board controls, saving, undo, duplicate). Verify that it matches the code.
- [ ] 10.2 Run types, lint, unit and integration tests and the speed gate. Verify that all pass.
- [ ] 10.3 Write `openspec/changes/storms-canvas/testing-plan.md` (asked for by the user on 2026-10-10). Turn every spec scenario into a numbered browser step the user can run themselves (what to do, what to see, a pass/fail box), grouped by feature. Give each step the automated test that also covers it, and add how to run all the automated checks. Verify that every `#### Scenario:` in `specs/` appears in it.
- [ ] 10.4 Hand the user the testing plan. They run it and confirm. Verify that each step is marked pass or fail, and record any issues found.
