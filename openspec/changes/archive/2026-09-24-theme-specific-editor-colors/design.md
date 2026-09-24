# Design

## Context

See proposal.md for motivation. Current state:

- `user_settings.editor_styles` (jsonb) holds `{ p?: { size?, color? }, h1?…h6? }`. `src/lib/settings/editor-styles.ts` validates writes strictly (`parseEditorStyles`), reads leniently (`readEditorStyles`), and turns styles into CSS variables (`--tb-h1-size`, `--tb-h1-color`) set on the editor root and on the Settings list.
- `globals.css` applies them: `.tb-editor h1 { color: var(--tb-h1-color, inherit) }`. The theme is a `dark` class on `<html>` (next-themes), so CSS can pick a variable per theme with no JavaScript and no flash on load.
- `ColorPicker` warns via `hardToReadIn(color, { light, dark })` (`src/lib/color.ts`), which checks both page backgrounds (`PAGE_BACKGROUNDS`).
- `SettingsProvider` keeps styles in state and saves them 500 ms after the last change; toasts use sonner.
- Deploys run migrations in the Vercel build while the old version keeps serving; migrations must stay additive (README).

## Goals / Non-Goals

**Goals:**
- Colors switch with the theme instantly, from CSS alone.
- Nobody's existing colors change on update, with no database migration.
- A change in Settings can be undone from the message it shows.

**Non-Goals:**
- Per-theme font sizes.
- Coloring selected text in notes (separate change `text-color-and-highlight`).

## Decisions

### D1. Style shape: `{ size?, light?, dark? }`
- `ElementStyle` becomes `{ size?: number; light?: string; dark?: string }`, hex colors lowercased. A missing `light`/`dark` means Automatic for that theme.
- **Reading** (`readEditorStyles`): an entry with the old `color` key and no `light`/`dark` is read as `light = dark = color`. When both are present, `light`/`dark` win.
- **Writing** (`parseEditorStyles`): accepts `size`, `light`, `dark`, and also the old `color` (converted the same way), so a browser tab still running the previous version can save during a deploy without an error. Output never contains `color`.
- Alternative: a SQL data migration rewriting `color` into both keys. Rejected: the old version still serving during the build would read the new shape as "no color" for a moment, and read-time conversion needs no migration at all.

### D2. CSS variables per theme
- `editorStyleVariables` emits `--tb-<el>-light` and `--tb-<el>-dark` (plus `--tb-<el>-size` as now).
- `globals.css`: `.tb-editor h1 { color: var(--tb-h1-light, inherit) }` and `.dark .tb-editor h1 { color: var(--tb-h1-dark, inherit) }`, for p and h1–h6. Switching theme flips the class and the color with it.
- Previews force a theme: `.tb-preview-light` and `.tb-preview-dark` wrappers set the page background and text color of that theme (`PAGE_BACKGROUNDS` and the theme's foreground) and select `--tb-<el>-light` or `--tb-<el>-dark` with selectors more specific than the `.dark .tb-editor` rule, so a light preview stays light inside the dark page.

### D3. Settings row
- Each row: the text preview twice (light cell, dark cell), the size field, two color swatches labelled "Light" and "Dark", and Reset.
- On narrow screens the previews stack above the controls, as the single preview does now.
- The section description changes to: "Default size and color of text in your notes. Changes apply to every note and are saved automatically."

### D4. Picker warning for one theme
- `ColorPicker` gets an optional `theme?: "light" | "dark"`. With a theme, the warning checks only that theme's background (`hardToReadIn` filtered to it); without one it checks both, as now (used by future pickers such as Storms).

### D5. Undo message
- `setEditorStyles(next, change?)` takes an optional description (`{ key, label }`, for example `{ key: "h1:light", label: "Heading 1 color (Dark theme)" }`).
- For each `key`, the value before the first change of a burst is remembered; one sonner toast per key (fixed toast `id`) shows "<label> changed" with **Undo**, so typing a size doesn't stack toasts. The burst ends when the toast closes (default duration).
- Undo sets that element's property back to the remembered value through the same `setEditorStyles` path (saved like any change) and closes the toast.
- Reset all keeps its confirmation dialog and shows no Undo. Reset on one element shows an Undo that restores the whole element.

## Risks / Trade-offs

- [A browser tab still running the old version reads a new-shape entry as no color] → Only until it reloads; the data isn't lost, and the old reader ignores unknown keys.
- [Old version writes the old shape after the new one wrote the new shape] → The new reader prefers `light`/`dark` when present and the old write replaces the whole object, so the last writer wins as today.
- [Two previews per row make the Settings list taller] → Previews are one line each; acceptable for seven rows.

## Migration Plan

No database migration. Deploy as usual; stored styles convert on read and are written in the new shape on the next save. Rollback: revert the commit. The previous version reads new-shape entries as Automatic, so colors would show as Automatic until set again (sizes are unaffected).
