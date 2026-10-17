# Design

## Context

- **Editor setup:**
  - Notes use Tiptap 3.31.
  - One extension list, `noteExtensions()` in `src/lib/notes/extensions.ts`, is shared by the editor and by the save validation (`validate.ts` builds its schema from it).
  - Because the schema has no table node, the pasted HTML parser drops `<table>/<tr>/<td>` and keeps their text, which is the run-on paragraph in the PRD.
- **Paste handling (`note-editor.tsx`):**
  - `handlePaste` only takes over when the clipboard holds files and no text. Excel puts a picture of the cells on the clipboard next to the HTML and text, so this already ignores that picture.
  - `transformPasted` marks attachments that come from another note.
- **Attaching files (`use-attach.ts`):** files are inserted with `insertContentAt(selection.to, image | fileAttachment)`.
- **Toolbar (`note-toolbar.tsx`):**
  - a roving-tabindex toolbar of buttons and Base UI dropdown menus (`DropdownMenu`, `finalFocus={false}`);
  - each command runs through `editor.chain().focus()`.
- **Data:** the app is unreleased, so no old-data handling is needed (project rule). Existing notes contain no tables.

## Goals / Non-Goals

**Goals:**
- Tables pasted from web pages, Google Sheets and Excel keep their rows, columns, header row and merged cells.
- Simple editing from the toolbar, with column widths that are saved.
- Cells that hold text only.
- Save validation that stays as strict as it is for other nodes.

**Non-Goals:**
- Sorting, filtering, formulas, cell colours and borders.
- Merge and split commands, and images in cells.
- Word as a tested source, and a slash menu.
- Custom copy-out code: the default HTML copy is used, or copying out is dropped.

## Decisions

**D1. Use Tiptap's `@tiptap/extension-table` (Table, TableRow, TableHeader, TableCell), version 3.31.3.**
- It is MIT, it is the same version as the other Tiptap packages, and it is built on `prosemirror-tables`.
- `prosemirror-tables` provides the parts we need:
  - colspan and rowspan;
  - cell selection;
  - Tab and Shift+Tab between cells, with Tab in the last cell adding a row (`goToNextCell`);
  - the commands: add and delete rows and columns, toggle the header row, delete the table;
  - column resizing.
- It is added to `noteExtensions()`, so the editor and the validation agree automatically.
- Alternative: write our own table node. Rejected, because cell selection, spans and resizing are the hard parts and the library already does them.

**D2. Cells and header cells hold `paragraph+`, instead of the library's default `block+`.**
- This is how "text only, no images" (from the PRD) is enforced in the schema. It is checked on paste, on typing and on the server.
- When a paste brings an image, list or heading into a cell, the parser can't place it there. It drops the image and keeps the text as paragraphs.
- Inline marks and font size still apply, and text alignment applies because paragraphs carry it.
- Alternative: allow `block+` and filter it out on paste. Rejected, because a later drop or paste could still put an image in a cell, and the server would accept it.

**D3. Files go below the table.**
- In `use-attach.ts`, when the selection is inside a table, the insert position becomes the position right after the table node.
- After that, the existing "place cursor after" logic runs unchanged.
- This covers attaching from the toolbar, pasting a file and dropping a file. For a drop, the drop position is used, and it moves after the table if it falls inside one.

**D4. Column widths: `resizable: true`.**
- Each cell gets a `colwidth` attribute (an array of pixels), which is saved in the note JSON.
- The library's table view wraps the table in a `div.tableWrapper`, which we style with `overflow-x: auto`. That gives sideways scrolling without the page scrolling.
- Cell minimum width stays at the default of 25 px. `lastColumnResizable` keeps its default of true.

**D5. Save validation adds checks on table attributes in `validate.ts`, next to the attachment checks.**
- `colspan` and `rowspan` must be whole numbers from 1 to 100.
- `colwidth` must be null, or an array of `colspan` entries, each a whole number from 25 to 5000, or null.
- A failure returns "The note contains a table setting that isn't allowed."
- `doc.check()` already enforces the structure: rows hold cells, and cells hold paragraphs.

**D6. The Table control is one toolbar dropdown, placed after the Divider button.**
- **Outside a table:**
  - It shows "Insert table".
  - It runs `insertTable({ rows: 3, cols: 3, withHeaderRow: true })`. The cursor lands in the first cell (library default).
- **Inside a table:** it shows the editing items in this order:
  - Add row above / Add row below;
  - Add column left / Add column right;
  - separator;
  - Delete row / Delete column;
  - Clear cell;
  - Header row (a check item, `toggleHeaderRow`);
  - separator;
  - Delete table.
- **"Clear cell":** with a cell selection, it uses the library's delete-cell-selection. With a plain cursor, it replaces the cell's content with an empty paragraph, in one transaction.
- **Shared behaviour:** it follows the existing pattern of `data-toolbar-item`, `finalFocus={false}` and commands via `editor.chain().focus()`, so focus returns to the note.
- **Icon:** `Table` from lucide-react.
- Alternatives:
  - A floating menu over the table. Rejected: it means more code and more focus handling, and the PRD only needs the commands.
  - A right-click menu. Rejected: the browser's own menu is expected there in notes.

**D7. Styling in the `.tb-editor` styles.**
- Borders use the theme `border` token, and header cells use the `muted` background with bold text.
- Cell padding is 6×8 px.
- The selected-cell overlay and the resize handle use the `ring` token. Both are shown for light and dark themes.
- No new colours.

**D8. Copying out uses ProseMirror's default clipboard serializer, which writes the table's HTML.**
- The task checks it with a paste into Google Sheets.
- If it fails, the requirement "Copying a table out" is removed from the delta, as the PRD agreed, and no code is added.

**D9. Paste sources are checked with saved fixtures.**
- Test fixtures hold clipboard HTML captured from:
  - a web page (the FTL / LTL / groupage table);
  - Google Sheets, whose HTML is a `<table>` inside `<google-sheets-html-origin>`;
  - Excel, which is a `<table>` with Office styles.
- The tests parse each fixture through the note schema and check the rows, columns, header row and spans.
- The real clipboard round trip is a manual test step, because browsers can't fake another app's clipboard.

## Risks / Trade-offs

- **[A source's HTML parses badly, for example an Excel `<col>` or style-only header]** → The fixture tests catch it. Fix it with a small `parseHTML` tweak, or list the source as untested, as the PRD says.
- **[A pasted list or heading inside a cell becomes plain paragraphs]** → This is the accepted cost of D2, and the text is kept.
- **[`colwidth` makes stored JSON larger for big tables]** → It's small next to the 800 KB note limit. A table so large that the note goes over the limit gets the existing "too long" message.
- **[Toolbar commands are shown when they can't run]** → Each item is disabled when its `editor.can()` check is false.
- **[`prosemirror-tables` keyboard handling clashes with the note's Tab handling]** → The note's Tab handler only acts on links and selected attachments and returns false otherwise, so the table keymap gets Tab inside cells. A test covers Tab in a cell.
