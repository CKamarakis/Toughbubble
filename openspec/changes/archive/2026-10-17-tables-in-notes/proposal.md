# Proposal

PRD: knowledge/prds/tables-in-notes.md @ 81b4dcd

## Why

A table pasted into a note collapses into one run-on paragraph, and only bold survives. This was seen with an FTL / LTL / groupage comparison copied from a Google result. As a result, comparison and reference content can't be kept in notes. The editor has no table node, so the paste rule "drop what the editor does not support" throws the structure away.

## What Changes

- Notes gain tables, built on Tiptap's table extension:
  - header row;
  - merged cells kept when pasted;
  - resizable column widths saved with the note.
- **Pasted tables keep their structure.** This covers web pages, Google Sheets and Excel. Cell content keeps the formatting the editor supports. Images and source styling (fonts, colours) are dropped.
- **A "Table" control in the note toolbar.**
  - Outside a table, it inserts a 3×3 table with a header row.
  - Inside a table, it offers:
    - add a row above or below, or a column left or right;
    - delete the row, the column, or the whole table;
    - clear the cell;
    - turn the header row on or off.
- **Cells are edited like the rest of the note.** They hold paragraphs, headings, lists, checklists, quotes and code blocks, with all formatting and font sizes, but no images, file cards or nested tables. Header cells default to bold on a muted background. Files attached, pasted or dropped while the cursor is in a table go below the table.
- **Wide tables scroll sideways** inside the note, and the page doesn't scroll.
- **Saving checks tables.** Server-side validation accepts table nodes and keeps their attributes in range: cell spans and column widths.
- **Copying tables between notes** keeps everything: rows, columns, header row, merged cells, widths and formatting. A block of selected cells copies as a smaller table. Copying into other apps (Google Sheets) is not promised.
- **Out of scope:**
  - sorting, filters and formulas;
  - images in cells;
  - cell colours and borders;
  - merge and split commands, and removing a single cell;
  - Word as a tested source;
  - a slash menu;
  - a Settings default for header-cell style (later, if wanted).

## Capabilities

### New Capabilities
- `note-tables`: tables in a note body. Covers pasting from common sources, inserting, editing rows, columns and cells, cell content and formatting, the header row, merged cells, column widths, sideways scrolling, saving, undo, and copying tables between notes.

### Modified Capabilities
- `note-editor`:
  - "Block formatting" adds tables to the supported blocks.
  - "Pasting" says a pasted table keeps its structure (see note-tables).

## Impact

- **Dependency:** `@tiptap/extension-table`, the same 3.x line as the other Tiptap packages.
- **Code:**
  - `src/lib/notes/extensions.ts` adds the table nodes, which are shared by the editor and the server validation.
  - `src/lib/notes/validate.ts` adds checks on table attributes.
  - `src/components/notes/note-toolbar.tsx` adds the Table control.
  - Table styles are added (`globals.css` or the `tb-editor` styles).
  - Attachment insertion moves files out of table cells.
- **Data:** note bodies may now contain `table`, `tableRow`, `tableHeader` and `tableCell` nodes. Existing notes are unchanged, and no migration is needed.
- **Status:** the PRD is still marked Draft; the user started this proposal from it directly.
