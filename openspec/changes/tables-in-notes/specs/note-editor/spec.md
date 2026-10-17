# Spec Delta

## MODIFIED Requirements

### Requirement: Block formatting
The editor SHALL support paragraphs, headings of levels 1 to 6, bulleted lists, numbered lists, checklists with items that can be checked and unchecked, blockquotes, code blocks, dividers, and tables (see note-tables).

#### Scenario: Turn a paragraph into a heading
- **WHEN** a user places the cursor in a paragraph and chooses Heading 2
- **THEN** the paragraph becomes a level-2 heading

#### Scenario: Check a checklist item
- **WHEN** a user clicks the checkbox of a checklist item
- **THEN** the item is shown as done, and it is still done after reopening the note

#### Scenario: Nested lists
- **WHEN** a user presses Tab in a list item that follows another item
- **THEN** the item is indented one level under the previous item, and Shift+Tab moves it back out

### Requirement: Pasting
Pasted content SHALL keep formatting the editor supports and SHALL drop what it does not support, keeping the text. A pasted table SHALL keep its rows and columns (see note-tables). Images inside pasted web page content SHALL NOT be inserted. Image and other files pasted or dropped from the clipboard or the computer SHALL be attached to the note (see note-attachments).

#### Scenario: Paste from a web page
- **WHEN** a user pastes a copied web page section with a heading, bold text, a list, and an image
- **THEN** the heading, bold text, and list are kept, and the image is not inserted

#### Scenario: Paste a table
- **GIVEN** a table copied from a web page
- **WHEN** a user pastes it into a note
- **THEN** it is kept as a table with the same rows and columns, not run together into one paragraph

#### Scenario: Paste an image file
- **WHEN** a user pastes an image copied as a file or screenshot
- **THEN** the image is uploaded and inserted at the cursor
