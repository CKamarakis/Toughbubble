## How it works, roughly
Tables are built on the editor's standard table add-on (Tiptap). Column widths are kept between 25 and 5000 px, and a cell can span 1 to 100 rows or columns. A table wider than the note scrolls sideways inside the note.

## Why

- **Pasting tables**: tables exist because a pasted table (an FTL / LTL / groupage comparison from a Google result) turned into one run-on paragraph. Pasted widths and spans that are out of range are pulled into range rather than refused, so a paste never produces a note that won't save. [[tiptap-editor]]
- **Editing a table**: all commands sit in one toolbar menu. A floating menu would mean more code and focus handling, and right-click is left for the browser's own menu. Delete table was added because without it a table is hard to remove. Header column was added because web tables often use the first column as headers.
- **What a cell holds**: the note's rules themselves keep images, files and nested tables out of cells, so the limit holds when you paste, when you type and on the server. Files added while you're in a table go just below it.
- **Saving tables**: saves stay as strict as for the rest of the note. Dragging a column rounds its width into range in the same step, so dragging can't produce a note that won't save. This was found in code review.
