# Tables in notes: testing plan

You are checking tables in notes: pasting them from the web, Google Sheets and Excel, making and editing them, and copying them between notes.

- **Time:** about 25 minutes. Steps 1 to 6 (the basics) take about 12.
- **You need:**
  - the app open and signed in (`http://localhost:3001`, or the deployed site);
  - two notes made for this test, called "Tables" and "Tables 2";
  - a Google Sheet and an Excel file with a few cells in them;
  - the Google result from the PRD (FTL / LTL / groupage). Any web page with a table also works.
- **How to use it:** do each step, look at what happens, then tick **Pass** or **Fail** and write anything odd under Notes. A failed step is useful, not a problem.
- **"Browser check"** says whether someone has already looked at the step in a browser.
- **"Also checked automatically by"** names the automated test that covers the same thing. "Browser only" means your eyes are the only check.
- The small italic line under each title names the requirement and scenario it covers, from `specs/note-tables` in this change.

---

## 1. Pasting

**1. A table from a web page** _(note-tables, Pasting tables: Paste a table from a web page; Formatting in cells)_
- **Do:** Select the FTL / LTL / groupage table on the Google result page, press Ctrl+C, click an empty line in "Tables" and press Ctrl+V.
- **You should see:**
  - a table with the same rows and 4 columns;
  - the first row is a header row: bold on a light grey background;
  - bold text and links in the cells are kept.
- **Also checked automatically by:** `src/lib/notes/tables.test.ts` ("keeps a web table's rows, columns, header row and cell formatting"). That test uses a saved copy of the page's HTML, not the real page.
- **Browser check:** Not yet.
- [ ] Pass  [ ] Fail   Notes:

**2. A range from Google Sheets** _(Pasting tables: Paste from Google Sheets)_
- **Do:** Select 3 rows by 3 columns in Google Sheets, press Ctrl+C, then paste on an empty line in "Tables".
- **You should see:** a 3 by 3 table with the same text. The column widths are roughly those from Sheets.
- **Also checked automatically by:** `src/lib/notes/tables.test.ts`, using a reconstruction of the HTML Sheets sends.
- **Browser check:** Not yet.
- [ ] Pass  [ ] Fail   Notes:

**3. A range from Excel** _(Pasting tables: Paste from Excel)_
- **Do:** Select a few cells in Excel, press Ctrl+C, then paste on an empty line in "Tables".
- **You should see:**
  - a table with the same rows, columns and text;
  - **no** picture of the cells attached below it. Excel also puts a picture on the clipboard, and the note should ignore it.
- **Also checked automatically by:** `src/lib/notes/tables.test.ts` covers the table, using a reconstruction of Excel's HTML. Whether the picture is ignored can only be checked in the browser.
- **Browser check:** Not yet.
- [ ] Pass  [ ] Fail   Notes:

**4. Images, merged cells and a header column** _(Pasting tables: Images in a pasted table; Merged cells; Header column)_
- **Do:** Paste a web table that has a picture in a cell, then one with a cell spanning two columns. Wikipedia infoboxes and comparison tables are good examples.
- **You should see:**
  - the picture is gone and the text around it is kept;
  - the wide cell still spans two columns;
  - a first column of headers stays bold and grey.
- **Also checked automatically by:** `src/lib/notes/tables.test.ts`.
- **Browser check:** Not yet.
- [ ] Pass  [ ] Fail   Notes:

## 2. Making and editing

**5. Insert a table with the keyboard** _(Inserting a table: Insert a table; Keyboard access)_
- **Do:**
  1. Click an empty line in "Tables".
  2. Press Tab until the toolbar has focus, then use the arrow keys to reach the Table button (grid icon).
  3. Press Enter, then Enter again on "Insert table".
- **You should see:**
  - a 3 by 3 table with a header row, filling the note's width with equal columns;
  - the cursor in the first cell, so typing goes there.
- **Also checked automatically by:** `src/components/notes/table-menu.dom.test.ts`.
- **Browser check:** Pass (Chromium, 2026-10-17, Claude's script).
- [ ] Pass  [ ] Fail   Notes:

**6. Rows, columns, cells and headers** _(Editing a table: all scenarios)_
- **Do:** With the cursor in a body cell of a table, try each item in the Table menu:
  - add a row above and below;
  - add a column left and right;
  - delete the row;
  - delete the column;
  - clear the cell;
  - turn the header row off and on;
  - turn the header column on;
  - finally, delete the table.
  Then make a new table and press Tab in its last cell.
- **You should see:**
  - each command does what it says, and Ctrl+Z undoes it;
  - "Clear cell" empties the cell but leaves it in place;
  - Tab in the last cell adds a new row, and Shift+Tab goes back one cell;
  - there are no commands to sort, merge or split.
- **Also checked automatically by:** `src/components/notes/table-menu.dom.test.ts`.
- **Browser check:** Not yet.
- [ ] Pass  [ ] Fail   Notes:

**7. Format a header cell; a heading and a list in a cell** _(What a cell holds: Format a header cell; Heading and list in a cell)_
- **Do:**
  1. In a header cell, select its text and set the size to 20 with the toolbar, then make it italic.
  2. In a body cell, choose Heading 3 and type a line. Press Enter and click the bulleted list button.
  3. Reload the page.
- **You should see:** after the reload, the header is still 20 px, italic and bold, and the body cell still holds a heading followed by a list.
- **Also checked automatically by:** `src/components/notes/table-menu.dom.test.ts` ("the note's formatting works in cells and saves").
- **Browser check:** Not yet.
- [ ] Pass  [ ] Fail   Notes:

**8. A file while in a table** _(What a cell holds: Attach a file while in a table)_
- **Do:** With the cursor in a table cell, paste a screenshot (Win+Shift+S, then Ctrl+V). Then do the same with the paperclip button, and by dropping a file onto a cell.
- **You should see:** each time, the file is attached and shown just below the table, never inside a cell.
- **Also checked automatically by:** `src/lib/notes/tables.test.ts` covers where the file goes. The real paste and upload can only be checked in the browser.
- **Browser check:** Not yet.
- [ ] Pass  [ ] Fail   Notes:

**9. Column widths and wide tables** _(Column widths: Resize a column; Wide tables: Wide table)_
- **Do:**
  1. Drag the right border of a table's first column to make it wider, wait for "Saved", and reload.
  2. Paste a table from Sheets with 12 or more columns.
- **You should see:**
  - after the reload, the column keeps its new width;
  - the wide table scrolls sideways inside the note, and the rest of the page doesn't move sideways.
- **Also checked automatically by:** browser only.
- **Browser check:** Pass (Chromium, 2026-10-17, Claude's script). The width was kept across a reload (190 → 311 px), and a 12-column table scrolled inside the note.
- [ ] Pass  [ ] Fail   Notes:

## 3. Copying between notes

**10. A whole table and a block of cells** _(Copying tables between notes: both scenarios; Pasting tables: Paste into a table)_
- **Do:**
  1. In "Tables", make a table with a header row, a widened column and bold text. Click its first cell and Shift+click its last cell to select all of it, then press Ctrl+C.
  2. Paste on an empty line in "Tables 2".
  3. Back in "Tables", select a 2 by 2 block of cells, copy it, and paste it on an empty line.
  4. Paste the same block with the cursor in a table's last row.
- **You should see:**
  - in "Tables 2", the same table: header row, column width and bold text;
  - the 2 by 2 block pasted on an empty line arrives as a 2 by 2 table;
  - pasted into a table, it fills cells from the cursor's cell, and the table grows a row to fit.
- **Also checked automatically by:** `src/components/notes/table-copy.dom.test.ts`.
- **Browser check:** Not yet.
- [ ] Pass  [ ] Fail   Notes:

**11. Light and dark themes**
- **Do:** Look at a table with a header row in both themes (Account menu > theme), and select a few cells.
- **You should see:** the borders, the header background and the cell selection are easy to see in both themes.
- **Also checked automatically by:** browser only.
- **Browser check:** Pass (Chromium, 2026-10-17, screenshots).
- [ ] Pass  [ ] Fail   Notes:
