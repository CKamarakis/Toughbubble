# note-tables Specification

## Purpose
Lets a user keep tables in a note: paste them from common sources or other notes with their rows and columns intact, create new ones, format cell content like the rest of the note, and make simple edits to rows, columns and cells.

## Requirements

### Requirement: Pasting tables
A table pasted into a note SHALL be kept as a table with the same rows and columns, from web pages, Google Sheets and Excel. A header row or header column in the source SHALL stay a header row or column, and merged cells SHALL stay merged. A table pasted while the cursor is in a table SHALL fill cells starting at the cursor's cell, adding rows and columns as needed. Cell content SHALL keep the formatting the editor supports (see "What a cell holds"); other source styling (fonts, colours, borders) SHALL be dropped. Images and files in a pasted table SHALL be dropped, keeping the text.

#### Scenario: Paste a table from a web page
- **GIVEN** a 4-column table with a header row copied from a web page
- **WHEN** the user pastes it into a note
- **THEN** it shows as a table with the same rows and 4 columns, and its first row is a header row

#### Scenario: Paste from Google Sheets
- **GIVEN** a range of 3 rows by 3 columns copied from Google Sheets
- **WHEN** the user pastes it into a note
- **THEN** it shows as a table of 3 rows by 3 columns with the same cell text

#### Scenario: Paste from Excel
- **GIVEN** a range of cells copied from Excel
- **WHEN** the user pastes it into a note
- **THEN** it shows as a table with the same rows, columns and cell text, and no picture of the cells is attached to the note

#### Scenario: Formatting in cells
- **GIVEN** a copied table whose cells contain bold text, a link and a bulleted list
- **WHEN** the user pastes it into a note
- **THEN** the bold text, the link and the list are kept in their cells

#### Scenario: Images in a pasted table
- **GIVEN** a copied web table with an image in one cell
- **WHEN** the user pastes it into a note
- **THEN** the table arrives without the image and the cell keeps its text

#### Scenario: Merged cells
- **GIVEN** a copied table with a cell spanning two columns
- **WHEN** the user pastes it into a note
- **THEN** that cell still spans two columns

#### Scenario: Out-of-range widths and spans
- **GIVEN** a copied table with a column 3 px wide and a cell spanning 0 columns
- **WHEN** the user pastes it into a note
- **THEN** the width becomes 25 px and the span 1, and the note saves normally

#### Scenario: Header column
- **GIVEN** a copied web table whose first column holds header cells
- **WHEN** the user pastes it into a note
- **THEN** the first column is shown as a header column

#### Scenario: Paste into a table
- **GIVEN** the cursor in the last row of a 3 by 3 table, and a copied table of 2 rows by 2 columns
- **WHEN** the user pastes
- **THEN** the copied cells replace the cells from the cursor's cell onwards, and the table grows by one row so all of them fit

### Requirement: Inserting a table
The note toolbar SHALL offer a Table control. With the cursor outside a table, it SHALL insert a table of 3 rows by 3 columns whose first row is a header row, and place the cursor in its first cell.

#### Scenario: Insert a table
- **GIVEN** the cursor on a line in a note, outside any table
- **WHEN** the user chooses Insert table from the toolbar's Table control
- **THEN** a 3 by 3 table with a header row appears and the cursor is in its first cell

#### Scenario: New table fills the note
- **GIVEN** a note wider than three 25 px columns
- **WHEN** the user inserts a table
- **THEN** it fills the note's width with three equal columns, until a column is dragged

#### Scenario: Keyboard access
- **GIVEN** focus on the note toolbar
- **WHEN** the user moves to the Table control with the arrow keys and opens it with Enter
- **THEN** its choices can be picked with the keyboard and focus returns to the note

### Requirement: Editing a table
With the cursor in a table, the Table control SHALL offer: add a row above or below, add a column to the left or right, delete the row, delete the column, clear the cell, turn the header row on or off, turn the header column on or off, and delete the table. Clearing a cell SHALL remove its contents and keep the cell. Tab SHALL move to the next cell and Shift+Tab to the previous one; Tab in the last cell SHALL add a row. There SHALL be no command to sort, filter, merge or split cells.

#### Scenario: Add and delete a row
- **GIVEN** the cursor in the second row of a 3-row table
- **WHEN** the user chooses Add row below, then Delete row
- **THEN** the table first has 4 rows with an empty row after the second, then the row with the cursor is removed

#### Scenario: Delete a column
- **GIVEN** the cursor in the middle column of a 3-column table
- **WHEN** the user chooses Delete column
- **THEN** the table has 2 columns and the other columns keep their text

#### Scenario: Clear a cell
- **GIVEN** the cursor in a cell with text
- **WHEN** the user chooses Clear cell
- **THEN** the cell is empty and the table keeps the same rows and columns

#### Scenario: Header row off
- **GIVEN** a table with a header row
- **WHEN** the user turns the header row off
- **THEN** the first row is shown and saved as a normal row

#### Scenario: Header column on
- **GIVEN** a table without a header column
- **WHEN** the user turns the header column on
- **THEN** the first column is shown and saved as header cells

#### Scenario: Delete the table
- **GIVEN** the cursor in a table
- **WHEN** the user chooses Delete table
- **THEN** the table is removed from the note

#### Scenario: Move between cells
- **GIVEN** the cursor in the last cell of a table
- **WHEN** the user presses Tab
- **THEN** a new row is added and the cursor is in its first cell

### Requirement: What a cell holds
A table cell, including a header cell, SHALL be edited like the rest of the note: it SHALL hold paragraphs, headings, bulleted and numbered lists, checklists, quotes and code blocks, with all inline formatting, font sizes, text alignment and links, using the same toolbar and shortcuts. A cell SHALL NOT hold images, file cards or another table. Header cells SHALL be shown bold on a muted background by default, and the user's own formatting SHALL apply on top. Files attached, pasted or dropped while the cursor is in a table SHALL be added to the note directly below the table.

#### Scenario: Format a header cell
- **GIVEN** the cursor in a header cell
- **WHEN** the user sets its text to 20 px and italic from the toolbar
- **THEN** the header text shows at 20 px, italic and bold, and keeps that after a reload

#### Scenario: Heading and list in a cell
- **GIVEN** the cursor in a cell
- **WHEN** the user chooses Heading 3, types a line, then turns the next line into a bulleted list
- **THEN** the cell holds a level-3 heading followed by a list

#### Scenario: Attach a file while in a table
- **GIVEN** the cursor in a table cell
- **WHEN** the user pastes an image file
- **THEN** the image is attached and shown directly below the table, not inside the cell

### Requirement: Column widths
A user SHALL be able to change a column's width by dragging its right border. Column widths SHALL be saved with the note.

#### Scenario: Resize a column
- **GIVEN** a table in a note
- **WHEN** the user drags a column border to make it wider and reloads the note
- **THEN** the column has the new width

### Requirement: Wide tables
A table wider than the note SHALL scroll sideways within the note; the page SHALL NOT scroll sideways.

#### Scenario: Wide table
- **GIVEN** a pasted table with 12 columns that is wider than the note
- **WHEN** the user views the note
- **THEN** the table can be scrolled sideways and the rest of the note stays in place

### Requirement: Saving tables
Tables SHALL be saved with the note like other content and SHALL take part in undo and redo. A save SHALL be refused if a table's cell spans or column widths are out of range.

#### Scenario: Reload keeps the table
- **GIVEN** a table the user edited
- **WHEN** the user reloads the note
- **THEN** the table shows the same rows, columns, header row and text

#### Scenario: Undo a table edit
- **GIVEN** the user just deleted a row
- **WHEN** the user presses Ctrl+Z, then Ctrl+Shift+Z
- **THEN** the row comes back, then is deleted again

#### Scenario: Out-of-range table attributes
- **WHEN** a save contains a cell spanning 0 columns or a column width of 100,000 pixels
- **THEN** the save is refused with an error and the stored note is unchanged

### Requirement: Copying tables between notes
A table copied from a note and pasted into the same or another note SHALL arrive unchanged: the same rows, columns, header row, merged cells, column widths and cell formatting. Copying a block of selected cells SHALL paste them as a table of those cells.

#### Scenario: Copy a table to another note
- **GIVEN** a table with a header row, a merged cell, a widened column and bold text in note A
- **WHEN** the user selects the table, copies it and pastes it into note B
- **THEN** note B shows the same table, with the header row, merged cell, column width and bold text

#### Scenario: Copy some cells
- **GIVEN** a 4 by 4 table
- **WHEN** the user selects a block of 2 by 2 cells, copies them and pastes them on an empty line
- **THEN** a 2 by 2 table with those cells' content appears
