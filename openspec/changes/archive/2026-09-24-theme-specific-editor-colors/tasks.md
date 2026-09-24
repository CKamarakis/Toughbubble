# Tasks

## 1. Style model

- [x] 1.1 Change `ElementStyle` to `{ size?, light?, dark? }` in `src/lib/settings/editor-styles.ts` per D1 (lenient read converts the old `color` to both themes; strict write accepts `size`, `light`, `dark`, and the old `color`, and never outputs `color`; `withElementStyle` handles each theme); verify unit tests for both shapes, precedence when both are present, and resetting one theme
- [x] 1.2 Emit `--tb-<el>-light` / `--tb-<el>-dark` from `editorStyleVariables` and switch the editor color rules in `globals.css` per D2; verify a unit test for the variables and, in the browser, that switching theme switches a heading's color without reloading
- [x] 1.3 Update the settings integration tests for the new shape (save and read back, old-shape rows read as both themes, reset removes the key); verify they pass

## 2. Settings page

- [x] 2.1 Add the `theme` option to `ColorPicker` per D4; verify unit tests that yellow warns only for light and a near-black color only for dark
- [x] 2.2 Rebuild the Settings row per D3 (light and dark previews via `.tb-preview-light` / `.tb-preview-dark`, Light and Dark swatches, Reset for size and both colors) and the section text; verify in the browser in both themes, including a dark preview inside the light page and a light preview inside the dark page
- [x] 2.3 Add the Undo message per D5 (one toast per element property, Undo restores and saves, Reset one element offers Undo, Reset all keeps its confirmation); verify in the browser that Undo restores the preview, a note, and the value after reload, and that typing a size shows one toast

## 3. Verification and release

- [x] 3.1 Browser check on a production build: per-theme colors in a note across a theme switch, one theme set only, an old-shape color shown in both themes, picker warnings per theme, Undo, Reset, Reset all; verify all checks pass
- [x] 3.2 Update the README (editor settings: colors per theme) and run lint, unit, and integration tests; verify they pass
- [x] 3.3 Push a branch and check the preview; merge to `main` and verify on production that a heading color differs between the light and dark themes
