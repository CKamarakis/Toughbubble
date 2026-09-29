# Proposal

## Why

Two things get in the way of writing, found while using the app:

- Text typed right after a link becomes part of the link (spaces show up underlined), so there's no way to continue a line with plain text after a link. Tiptap's link mark extends to typed text when automatic link detection is on, which the editor enables.
- After selecting a whole note (Ctrl+A) and changing the font size, new text doesn't follow: empty lines and new paragraphs go back to the size from Settings. Users expect the Google Docs behavior, where the whole note takes the new size.

## What Changes

- **Links end where they end**: text typed after a link is plain text. Typed and pasted web addresses still become links automatically.
- **A size for the whole note**: applying a font size with the whole note selected also makes that size the note's own default for body text (paragraphs, list items, checklist items, quotes). Empty lines and text added later use it. Headings keep their sizes from Settings. Choosing Default with the whole note selected removes the note's size. The size is saved with the note; other notes are unaffected.
- The font-size control shows the note's size for body text without its own size.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `note-editor`: "Links" (typing after a link gives plain text) and "Font size" (a note's own body-text size set by sizing the whole note).

## Impact

- **Code**: `src/lib/notes/extensions.ts` (link mark not inclusive; a document attribute for the note's body size), `src/lib/notes/validate.ts` (validate that attribute), `src/components/notes/note-toolbar.tsx` (apply and clear the note size, show it), `src/components/notes/note-editor.tsx` (apply it as the paragraph size variable).
- **Database**: none. The size is part of the note body JSON, saved and versioned with the note.
- **Dependencies**: `@tiptap/extension-document` and `@tiptap/extension-link` become direct dependencies (already installed through other Tiptap packages; no new packages).
