# Spec Delta

## MODIFIED Requirements

### Requirement: Font size
Paragraphs and headings SHALL be shown in the default size and color the user set for that element in Settings (editor-settings); list items, checklist items, and quotes use the paragraph settings. A user SHALL be able to set selected text to a preset size or any whole-pixel size from 8 to 96, and SHALL be able to return it to the element's default. Setting a size while the whole note is selected SHALL also make it the note's own size for body text (paragraphs, list items, checklist items, and quotes), used instead of the Settings paragraph size in that note for text without its own size, including empty lines and text typed later; headings SHALL keep their Settings sizes. Choosing Default while the whole note is selected SHALL remove the note's own size. The note's size SHALL be saved with the note and SHALL NOT affect other notes.

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

#### Scenario: Size the whole note
- **WHEN** a user selects the whole note, sets 18, then clicks an empty line and types
- **THEN** the new text is shown at 18 px, and so is any paragraph added later in that note

#### Scenario: Headings keep their size
- **WHEN** a note has its own body size of 18 and the user adds a level-1 heading
- **THEN** the new heading is shown at its Settings size

#### Scenario: Other notes unaffected
- **WHEN** a note has its own body size of 18 and the user opens another note
- **THEN** the other note's body text uses the Settings paragraph size

#### Scenario: Remove the note's size
- **WHEN** a user selects the whole note of a note sized 18 and chooses Default
- **THEN** body text returns to the Settings paragraph size, including text added later

### Requirement: Links
A user SHALL be able to turn selected text into a link, edit or remove a link, and open a link in a new browser tab. Clicking a link SHALL open it in a new browser tab. Hovering a link, or placing the cursor in it with the keyboard, SHALL show its address with Open, Edit, and Remove. Text typed right after a link SHALL NOT become part of the link. Only web (http, https) and email (mailto) addresses SHALL be accepted; an address without a scheme SHALL be treated as https.

#### Scenario: Add a link
- **WHEN** a user selects text, chooses Link, and enters "example.com"
- **THEN** the text becomes a link to https://example.com

#### Scenario: Unsafe address
- **WHEN** a user enters an address starting with "javascript:"
- **THEN** no link is created and the user is told the address is not allowed

#### Scenario: Open a link
- **WHEN** a user clicks a link in a note
- **THEN** the address opens in a new browser tab and the note stays open

#### Scenario: Selecting link text doesn't open it
- **WHEN** a user drags across part of a link's text to select it
- **THEN** the text is selected and the link does not open

#### Scenario: Edit a link from its card
- **WHEN** a user hovers a link, chooses Edit, changes the address to "example.org", and applies it
- **THEN** the link points to https://example.org and its text is unchanged

#### Scenario: Remove a link from its card
- **WHEN** a user hovers a link and chooses Remove
- **THEN** the text stays and is no longer a link

#### Scenario: Keyboard access
- **WHEN** a user moves the cursor into a link with the arrow keys
- **THEN** the link's card shows its address with Open, Edit, and Remove, reachable with Tab

#### Scenario: Pasted links are checked too
- **WHEN** a user pastes content containing a link with a disallowed address
- **THEN** the text is kept but the disallowed link is not

#### Scenario: Typing after a link
- **WHEN** a line ends with a link and the user places the cursor at its end and types a space and "is useful"
- **THEN** " is useful" is plain text and the link still covers only its address

#### Scenario: Typed addresses still become links
- **WHEN** a user types "https://example.com" followed by a space and more words
- **THEN** "https://example.com" becomes a link and the space and words after it are plain text
