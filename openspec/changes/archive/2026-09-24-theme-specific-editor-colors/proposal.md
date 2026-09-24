# Proposal

## Why

Each element's color in Settings (Paragraph, Heading 1–6) is one color used in both themes. A color that reads well in the dark theme, such as yellow, is hard to read in the light theme and the other way round, so users who switch themes (for example, dark at night) have to settle for a color that works in both or keep changing it. Each theme needs its own color.

## What Changes

- **A color per theme**: each element has a Light color and a Dark color, set with two swatches in its Settings row. Font sizes stay shared by both themes.
- **Unset means Automatic**: a theme without its own color uses that theme's normal text color.
- **Existing colors are kept**: a color set before this change applies to both themes, so nothing looks different after the update.
- **Preview in both themes**: each Settings row previews its text on a light and a dark background side by side.
- **Warning per theme**: the low-contrast warning checks only the theme being edited (yellow for Dark doesn't warn about Light).
- **Notice and Undo**: the Editor section says changes apply to every note, and each change shows a short message naming the element and theme with an Undo button. Reset all keeps its confirmation.
- **Reset** on an element resets its size and both colors.
- Saved custom colors stay one shared list.
- Not in this change: coloring or highlighting selected text in a note (planned as a separate change, `text-color-and-highlight`).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `editor-settings`: "Settings page" (notice, two-theme preview), "Element color" (a color per theme, existing colors kept), "Color picker" (warning checks the theme being edited), and "Settings saved to the account" (Undo after a change; Reset covers both colors).

## Impact

- **Code**: `src/lib/settings/editor-styles.ts` (style shape, validation, reading the old shape, CSS variables per theme), the Settings row and preview, the settings context (Undo), the color picker (check one theme), and the editor CSS in `globals.css`.
- **Database**: no migration. `user_settings.editor_styles` is JSON; the new shape is written on the next save, and the old shape is read as "same color in both themes".
- **Dependencies**: none.
