# Tasks

## 1. Clipboard core

- [x] 1.1 `src/lib/storms/clipboard.ts`: `serializeSticky`, `parseCopiedSticky`, `stickyFromText`, `placeCopy` (D1, D2, D4). Verify with unit tests: round trip; parse rejects bad colour, size 7, 501 chars, NaN and an unknown version; text clamped to 500; copy centred on the point and clamped to ±1,000,000 px.
- [x] 1.2 `engine/actions.ts`: `pasteSticky(store, copied, at)` and `duplicateSelected(store)` — new id, top z, selected, one commit. Verify with store/actions unit tests: one undo step each; undo removes the copy and leaves the original; duplicate lands at `x + w + 20`, same `y`; nothing selected → no change.

## 2. Keys and events

- [x] 2.1 `routeKey` maps Ctrl/⌘+D (no Shift/Alt, sticky selected, not editing) to `"duplicate"`, with `preventDefault` (D3). Verify with `input.test.ts` cases and a DOM test that Ctrl+D duplicates and its default is prevented.
- [x] 2.2 Document `copy` and `paste` listeners gated on board focus and not editing; pointer position tracked for paste; centre of view fallback (D1, D2). Verify with DOM tests: copy writes `text/plain` and the custom type; paste of the custom type places a copy at the pointer; paste of plain text creates a sticky in the creation colour; while editing, events pass through untouched; listeners removed on detach.

## 3. Docs and checks

- [ ] 3.1 README Storms section: copy, paste, duplicate. Verify it matches the code.
- [ ] 3.2 `openspec/changes/storms-clipboard/testing-plan.md` in the storms-canvas format, one step per scenario plus browser-only steps (another tab, Safari fallback, bookmark dialog). Verify every `#### Scenario:` is in it.
- [ ] 3.3 Run types, lint, unit and integration tests and the speed gate. Verify all pass.
- [ ] 3.4 Hand the testing plan to the user and record their results.
