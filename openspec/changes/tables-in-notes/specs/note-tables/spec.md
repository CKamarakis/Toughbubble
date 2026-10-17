# Spec Delta

## Purpose

Lets a user keep tables in a note: paste them from common sources with their rows and columns intact, create new ones, and make simple edits to rows, columns and cells.

## ADDED Requirements

### Requirement: Pasting tables
A table pasted into a note SHALL be kept as a table with the same rows and columns, from web pages, Google Sheets and Excel. A header row in the source SHALL stay a header row, and merged cells SHALL stay merged. Cell text SHALL keep the inline formatting the editor supports (bold, italic, underline, strikethrough, inline code, links); other source styling (fonts, colours, borders) SHALL be dropped. Images and other content a cell cannot hold SHALL be dropped, keeping the text.

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
- **GIVEN** a copied table whose cells contain bold text and a link
- **WHEN** the user pastes it into a note
- **THEN** the bold text and the link are kept in their cells

#### Scenario: Images in a pasted table
- **GIVEN** a copied web table with an image in one cell
- **WHEN** the user pastes it into a note
- **THEN** the table arrives without the image and the cell keeps its text

#### Scenario: Merged cells
- **GIVEN** a copied table with a cell spanning two columns
- **WHEN** the user pastes it into a note
- **THEN** that cell still spans two columns

### Requirement: Inserting a table
The note toolbar SHALL offer a Table control. With the cursor outside a table, it SHALL insert a table of 3 rows by 3 columns whose first row is a header row, and place the cursor in its first cell.

#### Scenario: Insert a table
- **GIVEN** the cursor on a line in a note, outside any table
- **WHEN** the user chooses Insert table from the toolbar's Table control
- **THEN** a 3 by 3 table with a header row appears and the cursor is in its first cell

#### Scenario: Keyboard access
- **GIVEN** focus on the note toolbar
- **WHEN** the user moves to the Table control with the arrow keys and opens it with Enter
- **THEN** its choices can be picked with the keyboard and focus returns to the note

### Requirement: Editing a table
With the cursor in a table, the Table control SHALL offer: add a row above or below, add a column to the left or right, delete the row, delete the column, clear the cell, turn the header row on or off, and delete the table. Clearing a cell SHALL remove its contents and keep the cell. Tab SHALL move to the next cell and Shift+Tab to the previous one; Tab in the last cell SHALL add a row. There SHALL be no command to sort, filter, merge or split cells.

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

#### Scenario: Delete the table
- **GIVEN** the cursor in a table
- **WHEN** the user chooses Delete table
- **THEN** the table is removed from the note

#### Scenario: Move between cells
- **GIVEN** the cursor in the last cell of a table
- **WHEN** the user presses Tab
- **THEN** a new row is added and the cursor is in its first cell

### Requirement: What a cell holds
A table cell SHALL hold text in paragraphs with the editor's inline formatting and font sizes. Files attached, pasted or dropped while the cursor is in a table SHALL be added to the note directly below the table.

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

### Requirement: Copying a table out
A table copied from a note SHALL paste into Google Sheets as rows and columns.

#### Scenario: Copy to Google Sheets
- **GIVEN** a table in a note
- **WHEN** the user selects the table, copies it and pastes it into Google Sheets
- **THEN** the cells arrive in the same rows and columns
