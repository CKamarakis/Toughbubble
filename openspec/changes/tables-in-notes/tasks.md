# Tasks

## 1. Table nodes in the note schema

- [ ] 1.1 Add `@tiptap/extension-table@3.31.3` (same version as the other Tiptap packages); verify `npm ls @tiptap/extension-table` shows 3.31.3 and `npm run build` still passes.
- [ ] 1.2 Add Table (`resizable: true`), TableRow, TableHeader and TableCell to `noteExtensions()`, with cell and header content set to the text blocks of design D2 (D1, D2, D4); verify with a unit test in `src/lib/notes/` that `getSchema(noteExtensions())` knows the four nodes, accepts a heading and a list in a cell, and rejects an image, a file card and a nested table inside a cell.
- [ ] 1.3 Paste fixtures (design D9): save clipboard HTML for a web table (FTL / LTL / groupage, with a header row, bold, a link and a list in a cell), a Google Sheets 3×3 range, an Excel range, a web table with an image in a cell and one with a colspan, under `src/lib/notes/__fixtures__/tables/`; verify with a unit test that parses each through the note schema and checks rows, columns, header row, kept bold/link/list, dropped image and span.

## 2. Saving

- [ ] 2.1 Add table attribute checks to `validateNoteBody` (design D5: colspan/rowspan 1–100, colwidth null or `colspan` entries of 25–5000 or null), with the error "The note contains a table setting that isn't allowed."; verify with unit tests: a valid table passes, colspan 0 and colwidth 100000 are refused, and a table round-trips through `validateNoteBody` unchanged.
- [ ] 2.2 Verify with an integration test in `tests/integration/` that a note body with a table saves and loads back with the same rows, header row and column widths.

## 3. Files go below a table

- [ ] 3.1 In `use-attach.ts`, insert a file after the enclosing table when the insert position is inside a table, for attach, paste and drop (design D3); verify with a DOM test that pasting an image file with the cursor in a cell puts the image node directly after the table.

## 4. Table control in the toolbar

- [ ] 4.1 Add the Table dropdown after Divider in `note-toolbar.tsx` (design D6): Insert table outside a table; add row above/below, add column left/right, delete row, delete column, clear cell, header row (check item), delete table inside one; each item disabled when `editor.can()` says no; verify with DOM tests for insert (3×3, header row, cursor in first cell), add/delete row, delete column, clear cell keeps the cell, header row off, delete table, and that the menu opens and picks with the keyboard.
- [ ] 4.2 Verify with a DOM test that Tab in the last cell adds a row and Shift+Tab moves back a cell, and that Tab on a link still goes to its link card.
- [ ] 4.3 Verify with a DOM test that one table command followed by undo and redo restores and reapplies it.
- [ ] 4.4 Verify with a DOM test that the existing toolbar works in cells: in a header cell, set 20 px and italic; in a body cell, choose Heading 3 and a bulleted list; the state is right and survives `validateNoteBody`.
- [ ] 4.5 Copying tables between notes: verify with a DOM test across two editors (design D8): copying a whole table (header row, merged cell, widened column, bold text) and pasting it into the other editor gives an identical table node; copying a 2×2 cell selection from a 4×4 table pastes as a 2×2 table. Fix any attribute the copy loses.

## 5. Styling

- [ ] 5.1 Style tables in the `.tb-editor` styles (design D7): theme borders, header cells muted and bold, 6×8 px padding, selected-cell overlay and resize handle in `ring`, `.tableWrapper` with `overflow-x: auto`; verify in the browser in light and dark themes that a 12-column table scrolls sideways and the page does not.

## 6. Integration checks

- [ ] 6.1 Write `testing-plan.md` for the manual steps: real clipboard pastes from a web page (the PRD example), Google Sheets and Excel; Excel paste attaches no picture; format a header cell; drag a column border and reload; copy a table and a block of cells from one note to another in the browser; light and dark themes. Verify the file covers every note-tables scenario that the automated tests can't.
- [ ] 6.2 Run `npm run lint`, `npm test` and `npm run build`; verify all pass.
