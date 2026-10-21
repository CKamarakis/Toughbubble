---
title: Note text styles from Settings are applied as style variables, not stored in notes
status: current
---

## In short
- Each element's size and its light and dark colors become style variables on the editor, such as `--tb-h1-size`. The page's styles pick the variable for the theme being shown.

## Why (evidence)
- Changing a setting restyles every note at once, with no change to stored notes. A word's own size still wins (phase-2-notes-editor D6).
- Colors switch with the theme from styles alone, with no code and no flash on load (theme-specific-editor-colors D2).

## Gives you
- Switching themes changes colors instantly, without reloading.
- Old saved colors are converted as they are read, with no database migration (theme-specific-editor-colors D1).

## Limits you
- Styles apply to a kind of text (paragraph, heading level), not to selected words. Coloring selected text is a separate, planned change.

## Revisit if
- Per-theme sizes, or styles per note, are wanted.

## Affects
- editor-settings: Element font size, Element color, Settings page (previews).

## History
- 2026-09-23 phase-2-notes-editor: D6 and D9.
- 2026-09-24 theme-specific-editor-colors: one variable per theme.
