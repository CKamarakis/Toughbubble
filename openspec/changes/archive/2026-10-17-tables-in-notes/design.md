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
- Cells formatted like the rest of the note (headings, lists, sizes, bold), but no images or files.
- Tables copy between notes unchanged.
- Save validation that stays as strict as it is for other nodes.

**Non-Goals:**
- Sorting, filtering, formulas, cell colours and borders.
- Merge and split commands, and images in cells.
- Word as a tested source, and a slash menu.
- Copying tables into other apps such as Google Sheets: not promised.
- A Settings default for header-cell style (later, if wanted).

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

**D2. Cells hold every text block, but not images, file cards or tables.**
- Cell and header-cell content is `(paragraph | heading | bulletList | orderedList | taskList | blockquote | codeBlock | horizontalRule)+`, not the library's `block+`.
- A table is edited like the rest of the note: the same toolbar, shortcuts, font sizes, alignment and links work in cells.
- The schema itself keeps images, file cards and nested tables out, so the rule holds on paste, on typing and on the server.
- When a paste brings an image into a cell, the parser can't place it there, so it drops the image and keeps the text.
- Alternative: allow `block+` and filter on paste. Rejected, because a later drop or paste could still put an image in a cell, and the server would accept it.

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
- `doc.check()` already enforces the structure: rows hold cells, and cells hold their allowed blocks.
- Cell alignment must be left, center, right or empty. It is written into the cell's style, so other values are refused, the same way the table library already drops them on paste.
- Width entries of 0 or null mean "not set", as the table library uses them.
- Paste brings spans and widths into range instead of refusing them, so a paste can never produce a note that won't save.
- Dragging a column is kept in range the same way: after any change, a plugin rounds widths and limits them to 25–5000 px, in the same undo step, so a note always saves (found in code review: a drag can leave a fractional width).

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
  - Header row and Header column (check items, `toggleHeaderRow` / `toggleHeaderColumn`; kit:ready D4: web tables often use the first column as headers);
  - separator;
  - Delete table.
- **"Clear cell":** with a cell selection, it uses the library's delete-cell-selection. With a plain cursor, it replaces the cell's content with an empty paragraph, in one transaction.
- **Delete table** stays although the PRD doesn't list it (kit:ready D1): without it a table is hard to remove.
- **Shared behaviour:** it follows the existing pattern of `data-toolbar-item`, `finalFocus={false}` and commands via `editor.chain().focus()`, so focus returns to the note.
- **Icon:** `Table` from lucide-react.
- Alternatives:
  - A floating menu over the table. Rejected: it means more code and more focus handling, and the PRD only needs the commands.
  - A right-click menu. Rejected: the browser's own menu is expected there in notes.

**D7. Styling in the `.tb-editor` styles.**
- Borders use the theme `border` token, and header cells use the `muted` background with bold text. That is the default header style; the user's own formatting (size, italic, alignment, a heading) applies on top.
- A Settings default for header-cell style (like the per-element defaults in editor-settings) is left for later; it fits that pattern if it's wanted.
- Cell padding is 6×8 px.
- The selected-cell overlay and the resize handle use the `ring` token. Both are shown for light and dark themes.
- No new colours.

**D8. Copying tables between notes is required; copying to other apps is not.**
- Inside the app, ProseMirror copies a selection as its own slice (with an HTML fallback that carries the node data), so a pasted table keeps every attribute: header row, spans, `colwidth`, marks and font sizes.
- A cell selection copies as a table of those cells (`prosemirror-tables` handles the paste).
- Pasting a table while the cursor is in a table keeps the library's behaviour: the cells fill from the cursor's cell and the table grows to fit (kit:ready D3, spreadsheet-like).
- The existing `transformPasted` (attachments from another note) runs on the slice; cells hold no attachments, so it has nothing to change there.
- Tests cover both a whole table and a block of cells, between two editors.
- Pasting into Google Sheets or other apps is not promised; whatever the default HTML gives is accepted as it is.

**D9. Paste sources are checked with saved fixtures.**
- Test fixtures hold clipboard HTML captured from:
  - a web page (the FTL / LTL / groupage table);
  - Google Sheets, whose HTML is a `<table>` inside `<google-sheets-html-origin>`;
  - Excel, which is a `<table>` with Office styles.
- The tests parse each fixture through the note schema and check the rows, columns, header row and spans.
- The real clipboard round trip is a manual test step, because browsers can't fake another app's clipboard.

## Risks / Trade-offs

- **[A source's HTML parses badly, for example an Excel `<col>` or style-only header]** → The fixture tests catch it. Fix it with a small `parseHTML` tweak, or list the source as untested, as the PRD says.
- **[Toolbar commands that act on a whole block behave oddly in a cell, e.g. a checklist or code block in a narrow column]** → DOM tests cover heading, list and size in a cell; anything awkward gets fixed or noted in the testing plan.
- **[`colwidth` makes stored JSON larger for big tables]** → It's small next to the 800 KB note limit. A table so large that the note goes over the limit gets the existing "too long" message.
- **[Toolbar commands are shown when they can't run]** → Each item is disabled when its `editor.can()` check is false.
- **[`prosemirror-tables` keyboard handling clashes with the note's Tab handling]** → The note's Tab handler only acts on links and selected attachments and returns false otherwise, so the table keymap gets Tab inside cells. A test covers Tab in a cell.
