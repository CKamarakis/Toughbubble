# note-editor Specification

## Purpose
Lets a user write and format the body of a note, with changes saved automatically and never silently lost, including when the same note is open in more than one tab or device.

## Requirements
### Requirement: Note body editor
Opening a note SHALL show its body below the title in an editor the user can type in immediately. A note with no body SHALL show an empty editor with the placeholder "Start writing…". Storms SHALL keep their placeholder.

#### Scenario: Open a new note
- **WHEN** a user opens a note that has never been written in
- **THEN** the page shows the note's title and an empty editor with the placeholder "Start writing…"

#### Scenario: Reopen a note
- **WHEN** a user writes formatted text in a note, leaves, and opens it again later or on another device
- **THEN** the body appears exactly as it was saved, with the same text and formatting

### Requirement: Block formatting
The editor SHALL support paragraphs, headings of levels 1 to 6, bulleted lists, numbered lists, checklists with items that can be checked and unchecked, blockquotes, code blocks, and dividers.

#### Scenario: Turn a paragraph into a heading
- **WHEN** a user places the cursor in a paragraph and chooses Heading 2
- **THEN** the paragraph becomes a level-2 heading

#### Scenario: Check a checklist item
- **WHEN** a user clicks the checkbox of a checklist item
- **THEN** the item is shown as done, and it is still done after reopening the note

#### Scenario: Nested lists
- **WHEN** a user presses Tab in a list item that follows another item
- **THEN** the item is indented one level under the previous item, and Shift+Tab moves it back out

### Requirement: Inline formatting
The editor SHALL support bold, italic, underline, strikethrough, and inline code on selected text, and text alignment of left, center, right, and justify for paragraphs and headings.

#### Scenario: Bold a word
- **WHEN** a user selects a word and chooses Bold, or presses Ctrl+B (Cmd+B on macOS)
- **THEN** the word becomes bold

#### Scenario: Center a heading
- **WHEN** a user places the cursor in a heading and chooses Center
- **THEN** the heading is centered

### Requirement: Font size
Paragraphs and headings SHALL be shown in the default size and color the user set for that element in Settings (editor-settings); list items, checklist items, and quotes use the paragraph settings. A user SHALL be able to set selected text to a preset size or any whole-pixel size from 8 to 96, and SHALL be able to return it to the element's default.

#### Scenario: Pick a preset size
- **WHEN** a user selects text and picks 24 from the font-size control
- **THEN** the selected text is shown at 24 px, and the control shows 24 while the cursor is in it

#### Scenario: Enter a custom size
- **WHEN** a user types 13 into the font-size control and confirms
- **THEN** the selected text is shown at 13 px

#### Scenario: Size out of range
- **WHEN** a user enters 200 or 3 into the font-size control
- **THEN** the size is not applied and the control indicates the allowed range of 8 to 96

#### Scenario: Back to default
- **WHEN** a user selects text with a custom size and chooses Default
- **THEN** the text returns to the default size of its block

#### Scenario: Defaults follow Settings
- **WHEN** a user has set Heading 1 to 40 px and purple in Settings and opens a note with a level-1 heading
- **THEN** the heading is shown at 40 px in purple, and the font-size control shows 40 while the cursor is in it

### Requirement: Links
A user SHALL be able to turn selected text into a link, edit or remove a link, and open a link in a new browser tab. Only web (http, https) and email (mailto) addresses SHALL be accepted; an address without a scheme SHALL be treated as https.

#### Scenario: Add a link
- **WHEN** a user selects text, chooses Link, and enters "example.com"
- **THEN** the text becomes a link to https://example.com

#### Scenario: Unsafe address
- **WHEN** a user enters an address starting with "javascript:"
- **THEN** no link is created and the user is told the address is not allowed

#### Scenario: Open a link
- **WHEN** a user places the cursor in a link and chooses Open
- **THEN** the address opens in a new browser tab and the note stays open

#### Scenario: Pasted links are checked too
- **WHEN** a user pastes content containing a link with a disallowed address
- **THEN** the text is kept but the disallowed link is not

### Requirement: Toolbar and shortcuts
The note page SHALL show a formatting toolbar above the body that stays visible at the top of the window while the user scrolls through the note. The toolbar SHALL show which formatting applies at the cursor and SHALL be operable with the keyboard. Standard keyboard shortcuts and Markdown-style typing shortcuts SHALL apply formatting.

#### Scenario: Toolbar stays in view
- **WHEN** a user scrolls down a note longer than the window
- **THEN** the toolbar stays pinned at the top of the window, above the scrolled text

#### Scenario: Active formatting shown
- **WHEN** the cursor is inside bold text in a numbered list
- **THEN** the Bold and Numbered list controls show as active

#### Scenario: Markdown-style shortcut
- **WHEN** a user types "## " at the start of an empty line
- **THEN** the line becomes a level-2 heading

#### Scenario: Undo
- **WHEN** a user presses Ctrl+Z (Cmd+Z on macOS) after formatting text
- **THEN** the formatting is undone

### Requirement: Pasting
Pasted content SHALL keep formatting the editor supports and SHALL drop what it does not support, keeping the text.

#### Scenario: Paste from a web page
- **WHEN** a user pastes a copied web page section with a heading, bold text, a list, and an image
- **THEN** the heading, bold text, and list are kept, and the image is not inserted

### Requirement: Autosave
Changes to a note's body SHALL be saved automatically, without a Save button, within a few seconds of the user pausing and when the user leaves the note. The note SHALL show whether changes are being saved, saved, or could not be saved, and SHALL keep retrying failed saves while the note is open.

#### Scenario: Saved after a pause
- **WHEN** a user types a sentence and stops typing
- **THEN** the status shows "Saving…" and then "Saved", and reloading the page shows the sentence

#### Scenario: Leaving the note
- **WHEN** a user types and immediately opens another item from the sidebar
- **THEN** the typed text is saved and appears when the note is reopened

#### Scenario: Save fails
- **WHEN** a save cannot reach the server
- **THEN** the status shows that changes could not be saved yet, the editor keeps the typed text, and the save is retried until it succeeds

#### Scenario: Closing the tab with unsaved changes
- **WHEN** a user tries to close or reload the tab while changes are not yet saved
- **THEN** the browser asks for confirmation before leaving

#### Scenario: Last edited updated
- **WHEN** a note's body is saved
- **THEN** the note's last edited time becomes the time of that save

### Requirement: Edits from another tab or device
A save based on an older version of the note than the one stored SHALL be refused. The note SHALL then tell the user it was changed elsewhere and offer to load the latest version, discarding their unsaved changes, or to keep their version, replacing the stored one. When the user returns to a tab that has no unsaved changes, it SHALL load a newer stored version if there is one.

#### Scenario: Conflicting edits
- **WHEN** a note is open in two tabs, the user edits and saves in tab A, and then edits in tab B
- **THEN** tab B's save is refused, and tab B shows "This note was changed in another tab or device" with Load latest and Keep mine, and stops saving until the user chooses

#### Scenario: Load latest
- **WHEN** the user chooses Load latest
- **THEN** tab B shows the stored version from tab A, and its own unsaved changes are discarded

#### Scenario: Keep mine
- **WHEN** the user chooses Keep mine
- **THEN** tab B's version is saved and replaces tab A's, and autosave resumes

#### Scenario: Quiet refresh on return
- **WHEN** the user edits in tab A, then switches to tab B where nothing was typed since it last saved
- **THEN** tab B shows tab A's changes without any warning
