## ADDED Requirements

### Requirement: Autosave
Changes to a Storm's board SHALL save automatically about 1 second after the last change, with no Save button. Each save SHALL send only the items changed since the last save, together with the version it is based on. The header SHALL show "Saving…" and then "Saved". Text typed into a sticky SHALL be saved even if editing hasn't finished. Leaving the page with unsaved changes SHALL ask the user to confirm.

#### Scenario: Saved after a pause
- **WHEN** a user places a sticky and waits
- **THEN** the header shows "Saving…" then "Saved", and reloading the page shows the sticky

#### Scenario: Unfinished typing is saved
- **WHEN** a user types into a sticky, waits for "Saved" without finishing editing, and reloads
- **THEN** the sticky shows the typed text

#### Scenario: Only changes are sent
- **WHEN** a user moves one sticky on a board of 1,000 stickies
- **THEN** the save sends that one sticky, not the whole board

#### Scenario: Leaving with unsaved changes
- **WHEN** a user tries to close the tab while a save is pending
- **THEN** the browser asks for confirmation

### Requirement: Save failures and retries
When a save fails for a network or server reason, the header SHALL show "Couldn't save — retrying", the board SHALL keep the user's work, and the save SHALL be retried with growing pauses. Changes made while a save is in flight or failing SHALL be kept and included in the next save.

#### Scenario: Offline
- **WHEN** the connection drops and the user moves a sticky
- **THEN** the header shows "Couldn't save — retrying", the sticky stays where it was moved, and it saves once the connection is back

### Requirement: Changed elsewhere
A save based on an older version than the stored one SHALL NOT overwrite it. The user SHALL see "Changed elsewhere" with **Load latest**, which discards this tab's unsaved changes and shows the stored board, and **Keep mine**, which saves this tab's changes on top of the stored board (this tab's version wins for the same sticky; other stickies are kept) and then shows the combined board. Both SHALL clear the undo history. When a tab regains focus with nothing unsaved and the stored board is newer, it SHALL show the stored board and clear the undo history.

#### Scenario: Two tabs
- **WHEN** a Storm is open in two tabs, tab A saves a change, and tab B then saves a change
- **THEN** tab B shows "Changed elsewhere" and nothing in tab A's save is lost

#### Scenario: Keep mine
- **WHEN** tab A added sticky X, tab B moved sticky Y, and tab B chooses Keep mine
- **THEN** the stored board has both X and the moved Y, and tab B shows both

#### Scenario: Load latest
- **WHEN** tab B chooses Load latest
- **THEN** tab B shows tab A's board and its own unsaved change is gone

#### Scenario: Refresh on focus
- **WHEN** tab A saves a change and the user switches to tab B, which has nothing unsaved
- **THEN** tab B shows tab A's change

### Requirement: Board size limit
A Storm's stored board SHALL be at most about 2 MB. A save that would exceed it SHALL be refused, keep the stored board unchanged, and show "This storm is too big to save. Remove some items." Saving SHALL resume after the next change.

#### Scenario: Too big
- **WHEN** a save would make the board larger than the limit
- **THEN** nothing is stored, the message is shown, and the board on screen keeps the user's work

### Requirement: Server checks
The server SHALL accept board saves only for the signed-in user's own active Storms, and SHALL reject malformed changes: unknown item types or fields, ids that aren't UUIDs, the same id twice or in both the changed and deleted lists, non-finite or out-of-range positions and sizes, widths or heights of zero or less, text over 5,000 characters, more than 5,000 entries in a list, or a change set over 800 KB. A pending change set larger than 800 KB SHALL be sent as several saves in order.

#### Scenario: Someone else's storm
- **WHEN** a request tries to save changes to another user's Storm
- **THEN** it is refused as not found and that Storm is unchanged

#### Scenario: A note's id
- **WHEN** a request sends board changes with a note's id
- **THEN** it is refused as not found and the note's body is unchanged

#### Scenario: Malformed change
- **WHEN** a request sends a sticky with a non-numeric position
- **THEN** it is refused and the stored board is unchanged

### Requirement: Undo and redo
Ctrl or ⌘ + Z and the Undo button SHALL undo the last board change; Ctrl or ⌘ + Shift + Z, Ctrl + Y and the Redo button SHALL redo it. Placing, moving, nudging, typing and deleting SHALL each be undoable: one editing session of a sticky's text SHALL be one step, and nudges within one second of each other SHALL be one step. Zooming, panning and selecting SHALL NOT be undo steps. At most 30 steps SHALL be kept. A new change SHALL clear the redo steps. Undo and redo SHALL save like any other change.

#### Scenario: Undo a move
- **WHEN** a user drags a sticky and presses Ctrl + Z
- **THEN** the sticky returns to where it was, and the board saves

#### Scenario: Typing is one step
- **WHEN** a user types "Hello" into a sticky, finishes, and presses Ctrl + Z
- **THEN** the sticky's text returns to what it was before editing

#### Scenario: Thirty steps
- **WHEN** a user makes 31 changes and presses Undo 31 times
- **THEN** only the last 30 changes are undone

#### Scenario: Zoom is not undone
- **WHEN** a user moves a sticky, zooms in, and presses Ctrl + Z
- **THEN** the sticky moves back and the zoom stays

### Requirement: Undo survives a reload
The undo and redo history SHALL be kept in the browser and restored when the Storm is reopened, only if the stored board has not changed since; otherwise it SHALL be discarded. The history SHALL be stored only for changes that have been saved. Signing out SHALL delete the stored history, and one user's history SHALL never be shown to another user on the same browser.

#### Scenario: Reload keeps undo
- **WHEN** a user moves a sticky, waits for "Saved", reloads, and presses Ctrl + Z
- **THEN** the sticky moves back

#### Scenario: Changed since
- **WHEN** a user makes changes in tab A, then changes the same Storm in tab B, then reloads tab A
- **THEN** tab A shows tab B's board and Undo is unavailable

#### Scenario: Sign-out clears history
- **WHEN** a user signs out and signs in again on the same browser
- **THEN** Undo is unavailable when they open the Storm
