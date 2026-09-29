# Design

## Context

See proposal.md for motivation. Current state:

- The link mark comes from StarterKit's Link with `autolink: true`. Tiptap's Link sets `inclusive()` to `this.options.autolink` (`node_modules/@tiptap/extension-link/src/link.ts`), so with autolink on, a cursor at the end of a link keeps the mark and typed text joins the link.
- Font size is a `fontSize` attribute on the `textStyle` mark, set by the toolbar (`setFontSize` / `unsetFontSize`). Text without it uses CSS variables from Settings (`--tb-p-size` for paragraphs, lists, quotes; `--tb-h1-size`… for headings), set on the editor root from `editorVars`.
- Ctrl+A gives an `AllSelection`; applying a size then marks the existing text only. New paragraphs and empty lines carry no mark.
- Note bodies are Tiptap JSON, validated on save against the shared extension list (`validate.ts`) and versioned.

## Goals / Non-Goals

**Goals:**
- Typing after a link gives plain text; automatic links keep working.
- A note can have its own body size that applies to all body text without its own size, now and later.

**Non-Goals:**
- A font family picker (only sizes exist).
- A note-level size for headings.

## Decisions

### D1. Link mark not inclusive
- The shared extension list configures Link through StarterKit and extends it with `inclusive: () => false`, keeping `autolink: true`. Autolink detects addresses through its own plugin on typing and paste, not through inclusiveness.
- A browser check confirms both: text after a link is plain, and a typed "https://example.com " still becomes a link.
- Found while checking: an address typed without a scheme ("example.com") has never become a link on its own, because the allow-check (shared with pasted links, where a scheme-less href is a relative link) requires http, https, or mailto. Unchanged here; a possible follow-up.

### D2. The note's body size is a document attribute
- The Document node gets an attribute `bodySize` (`"NNpx"` or null), so it lives in the body JSON: saved by autosave, versioned, part of conflicts and Load latest like the rest of the note. No database change.
- Validation: `bodySize` must be null or a size `parseFontSize` accepts (8–96 px); anything else rejects the save, like an out-of-range text size.
- A body saved before this change has no attribute and reads as null.

### D3. Setting and clearing it
- When the toolbar applies a size and the selection covers the whole document (`AllSelection`, or a text selection from the first to the last position), the same command also sets `bodySize` with `setDocAttribute`, so one undo step reverts both. Existing text gets the size mark as today.
- Default with the whole note selected unsets the size marks (as today) and sets `bodySize` to null.
- Sizing only part of the note never touches `bodySize`.

### D4. Showing it
- The editor root's style gets `--tb-p-size: <bodySize>` after the Settings variables, so paragraphs, list items, checklist items, and quotes without their own size use it; heading variables are untouched.
- The font-size control shows `bodySize` for body text without its own size (instead of the Settings paragraph size).
- The value is read from the editor state on each transaction (`useEditorState`), so Load latest, undo, and the quiet refresh update it.

## Risks / Trade-offs

- [An older tab saves a body without the attribute] → The attribute is dropped by that save; the size goes back to Settings. Only while an old tab is open during a deploy.
- [Users expect a partial selection to set the note's size] → Only the whole-note case does, as in Google Docs; partial selections size just that text.
- [Rollback] → The previous version ignores the unknown attribute on load and drops it on its next save; notes show Settings sizes again.
