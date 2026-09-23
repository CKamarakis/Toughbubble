# Spec Delta

## MODIFIED Requirements

### Requirement: Pasting
Pasted content SHALL keep formatting the editor supports and SHALL drop what it does not support, keeping the text. Images inside pasted web page content SHALL NOT be inserted. Image and other files pasted or dropped from the clipboard or the computer SHALL be attached to the note (see note-attachments).

#### Scenario: Paste from a web page
- **WHEN** a user pastes a copied web page section with a heading, bold text, a list, and an image
- **THEN** the heading, bold text, and list are kept, and the image is not inserted

#### Scenario: Paste an image file
- **WHEN** a user pastes an image copied as a file or screenshot
- **THEN** the image is uploaded and inserted at the cursor

### Requirement: Links
A user SHALL be able to turn selected text into a link, edit or remove a link, and open a link in a new browser tab. Clicking a link SHALL open it in a new browser tab. Hovering a link, or placing the cursor in it with the keyboard, SHALL show its address with Open, Edit, and Remove. Only web (http, https) and email (mailto) addresses SHALL be accepted; an address without a scheme SHALL be treated as https.

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
