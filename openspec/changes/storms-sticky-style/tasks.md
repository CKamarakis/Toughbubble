# Tasks

## 1. Model, palette and server checks

- [x] 1.1 `src/lib/storms/palette.ts` with the 12 presets (D5) and `inkFor(hex)`; `Sticky` gains optional `color` and `fontSize` (D1). Verify with a unit test that every preset/ink pair has a contrast ratio ≥ 4.5 and that a missing colour resolves to Yellow.
- [x] 1.2 `validate.ts` accepts `color` (preset hex only) and `fontSize` (integer 8–64), both optional. Verify with unit tests: preset accepted, `#123456` rejected, sizes 7, 65 and 12.5 rejected, missing fields accepted; and with an integration test in `tests/integration/storm-board.test.ts` that a save with both fields round-trips and an unknown colour is refused.

## 2. Auto-fit

- [x] 2.1 `fitFontSize(measure, text, w, h)` and size-aware `layoutSticky` in `text-layout.ts`, with a measure that takes a font size (D2). Verify with unit tests: "Hi" in 200×200 → 64; growing text shrinks monotonically; 500 characters → ≥ 8 and clipped only below 8; empty → 64; a stored `fontSize` is used as is.
- [x] 2.2 `store.setText` stores the text and its fitted size in one commit; undo restores both (D3). Verify with store unit tests.
- [x] 2.3 Text overlay renders at the fitted size and keeps lines in place while typing and on finish (D3). Verify with DOM tests: the textarea font size equals the fitted size after each keystroke, and starting/finishing an edit keeps the size.
- [x] 2.4 Renderer: per-sticky size (stored or fitted on first draw, cached per `w|h|text`), text drawn grouped by size (D4). Verify with renderer tests: an unsized sticky is drawn at its fitted size without a store change; groups set `ctx.font` once per size.

## 3. Colour

- [x] 3.1 Renderer draws each sticky's fill and text in its colour, White with a 1 px #D9D8D3 border (D4, D5). Verify with renderer tests for Yellow, Pink, Black (white text) and White (border).
- [x] 3.2 Store `setColor(id, hex)`: one undo step, no-op when unchanged (D6). Verify with store unit tests: colour change → one history step; undo restores yellow; redo reapplies.
- [x] 3.3 `sticky-toolbar.tsx` above the selected sticky with the Colour button and palette popover (D6): placement and flip, hidden while editing/dragging/panning, keyboard path, accessible names, clicks don't deselect, light in dark theme. Verify with DOM tests for show/hide, the keyboard path (Tab, Enter, arrows, Enter → colour applied, focus back on the button) and that a click on a swatch keeps the sticky selected.

## 4. Speed, docs and hand-over

- [x] 4.1 Speed bench board gets random preset colours and no stored sizes (D4). Verify that `npm run bench:storms` passes (median ≥ 50 fps, p95 ≤ 33 ms) and record the numbers.
- [x] 4.2 README Storms section: auto-fit and sticky colours. Verify it matches the code.
- [x] 4.3 Write `openspec/changes/storms-sticky-style/testing-plan.md` in the same format as storms-canvas's: one numbered browser step per spec scenario (do / see / pass-fail / automated test). Verify every `#### Scenario:` in this change's specs appears in it.
- [ ] 4.4 Run types, lint, unit tests, integration tests and the speed gate. Verify all pass.
- [ ] 4.5 Hand the testing plan to the user and record their results.
