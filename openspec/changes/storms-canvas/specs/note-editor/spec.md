## MODIFIED Requirements

### Requirement: Note body editor
Opening a note SHALL show its body below the title in an editor the user can type in immediately. A note with no body SHALL show an empty editor with the placeholder "Start writing…".

#### Scenario: Open a new note
- **WHEN** a user opens a note that has never been written in
- **THEN** the page shows the note's title and an empty editor with the placeholder "Start writing…"

#### Scenario: Reopen a note
- **WHEN** a user writes formatted text in a note, leaves, and opens it again later or on another device
- **THEN** the body appears exactly as it was saved, with the same text and formatting
