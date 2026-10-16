## ADDED Requirements

### Requirement: Copy, paste and duplicate
While the board has focus and no sticky's text is being edited, Ctrl or ⌘ + C SHALL copy the selected sticky (its text, colour and fitted size), Ctrl or ⌘ + V SHALL paste it as a new sticky centred on the mouse pointer when the pointer is over the board, or at the centre of the view otherwise, and Ctrl or ⌘ + D SHALL duplicate the selected sticky as a new sticky directly to its right with a 20 px gap. A copy SHALL be pasteable in the same Storm, in another Storm and in another tab of the same browser. Pasting plain text copied from outside the board SHALL create a new sticky with that text (its first 500 characters) in the colour for new stickies. Each paste or duplicate SHALL be one undo step and SHALL leave the new sticky on top and selected. Ctrl or ⌘ + D SHALL NOT open the browser's bookmark dialog over the board. A new sticky SHALL NOT be placed beyond 1,000,000 px from the centre. While a sticky's text is being edited, these keys SHALL act on the text as usual.

#### Scenario: Copy and paste at the pointer
- **GIVEN** a pink sticky "Plan" is selected
- **WHEN** the user presses Ctrl+C, moves the pointer to an empty spot and presses Ctrl+V
- **THEN** a pink sticky "Plan" of the same size appears centred on the pointer, on top and selected

#### Scenario: Paste in another Storm
- **WHEN** a user copies a sticky in one Storm, opens another Storm and presses Ctrl+V over the board
- **THEN** a copy of the sticky appears there

#### Scenario: Duplicate
- **WHEN** a user selects a sticky and presses Ctrl+D
- **THEN** a copy appears directly to its right with a 20 px gap, on top and selected, and the browser's bookmark dialog does not open

#### Scenario: Undo a paste
- **WHEN** a user pastes a sticky and presses Ctrl+Z
- **THEN** the pasted sticky is removed and the original is unchanged

#### Scenario: Paste text from elsewhere
- **GIVEN** the user copied the words "Call Anna" in another application
- **WHEN** they press Ctrl+V over the board
- **THEN** a new sticky with "Call Anna" appears at the pointer in the colour for new stickies

#### Scenario: Copy text while typing
- **WHEN** a user is editing a sticky's text, selects a word and presses Ctrl+C, then Ctrl+V
- **THEN** the word is copied and pasted inside the text, and no new sticky is made

#### Scenario: Nothing selected
- **WHEN** no sticky is selected and the user presses Ctrl+C or Ctrl+D
- **THEN** nothing happens
