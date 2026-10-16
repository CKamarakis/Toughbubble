## ADDED Requirements

### Requirement: Storm page layout
Opening a Storm SHALL show a slim header with the breadcrumb, the title (click to rename) and the item menu, and below it a board that fills the rest of the main pane with no page padding. The sidebar SHALL stay visible and collapsible as on other pages. The board's code SHALL be downloaded only when a Storm is opened.

#### Scenario: Open a storm
- **WHEN** a user selects a Storm in the sidebar
- **THEN** the main pane shows the breadcrumb, the Storm's title and its menu in a slim header, and the board fills the space below it

#### Scenario: Notes don't load the board
- **WHEN** a user opens a note and no Storm has been opened in that visit
- **THEN** the browser has not downloaded the board's code

### Requirement: Always-light board
The board, its toolbar and its zoom control SHALL use the light theme whatever the app theme. The header and sidebar SHALL follow the app theme.

#### Scenario: Dark app theme
- **WHEN** the app theme is dark and a user opens a Storm
- **THEN** the sidebar and header are dark, and the board, toolbar and zoom control are light

### Requirement: Plain board background
The board SHALL be a plain light grey surface (#F2F2F2) with no grid, dots or lines at any zoom, as in the Miro reference views.

#### Scenario: Plain at every zoom
- **WHEN** a user zooms the board anywhere from 10% to 400%
- **THEN** the background stays plain light grey with no dots or lines

### Requirement: Zoom
The board SHALL zoom between 10% and 400%. A mouse wheel, Ctrl or ⌘ + wheel, and a trackpad pinch SHALL zoom toward the pointer, keeping the board point under the pointer in place. A zoom control at the bottom right SHALL show − and + buttons that step through 10, 25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 350 and 400%, the current percentage (clicking it resets to 100%), and a fit button. Ctrl or ⌘ + = and − SHALL step, Ctrl or ⌘ + 0 SHALL reset to 100%, and Shift + 1 SHALL fit, while the board has focus. Zooming on the board SHALL NOT zoom the web page itself. A trackpad pinch SHALL be sensitive enough that one ordinary pinch takes the board from 100% to about 200%.

#### Scenario: Wheel zoom toward the pointer
- **WHEN** a user turns the mouse wheel with the pointer over a sticky
- **THEN** the board zooms and the sticky stays under the pointer

#### Scenario: Zoom limits
- **WHEN** a user keeps zooming in past 400% or out past 10%
- **THEN** the zoom stops at 400% or 10%

#### Scenario: Step buttons and readout
- **WHEN** a user at 100% clicks +
- **THEN** the board zooms to 125% and the readout shows "125%"

#### Scenario: Pinch zoom
- **GIVEN** the board is at 100%
- **WHEN** a user makes one ordinary pinch-out on a trackpad
- **THEN** the board zooms to roughly 200%, without needing several pinches

#### Scenario: Reset to 100%
- **WHEN** a user clicks the percentage readout
- **THEN** the zoom returns to 100%

#### Scenario: Page zoom is not triggered
- **WHEN** a user presses Ctrl + wheel or Ctrl + = over the board
- **THEN** only the board zooms; the page's own size stays the same

### Requirement: Fit to items
The fit button and Shift + 1 SHALL zoom and pan so every item on the board is visible with a margin, within the zoom limits. On an empty board, fit SHALL return to 100% at the board's centre.

#### Scenario: Fit a spread-out board
- **WHEN** a board has stickies far apart and the user clicks fit
- **THEN** all stickies are visible on screen

#### Scenario: Fit an empty board
- **WHEN** a board has no items and the user clicks fit
- **THEN** the board shows its centre at 100%

### Requirement: Pan
A user SHALL pan the board with a two-finger trackpad scroll, by dragging with the right mouse button, and by holding Space and dragging with the left button (the cursor shows a hand). The browser's own right-click menu SHALL NOT appear on the board. Panning SHALL stop at 1,000,000 px from the board's centre in each direction.

#### Scenario: Trackpad pan
- **WHEN** a user scrolls with two fingers on a trackpad over the board
- **THEN** the board pans and the zoom stays the same

#### Scenario: Right-drag pan
- **WHEN** a user holds the right mouse button on the board and drags
- **THEN** the board pans and no browser menu appears

#### Scenario: Space-drag pan
- **WHEN** a user holds Space and drags with the left button
- **THEN** the cursor shows a hand and the board pans

#### Scenario: Board edge
- **WHEN** a user keeps panning in one direction
- **THEN** the view stops at 1,000,000 px from the centre

### Requirement: Last view per storm
Each Storm SHALL reopen at the zoom and position the user last left it at in that browser. With no stored view, a Storm SHALL open at 100% at the board's centre.

#### Scenario: Reopen where you left
- **WHEN** a user zooms to 50%, pans away, opens another item, and returns to the Storm
- **THEN** the board shows the same zoom and position

#### Scenario: First open
- **WHEN** a user opens a Storm for the first time in a browser
- **THEN** the board shows its centre at 100%

### Requirement: Bottom toolbar
A toolbar at the bottom centre of the board SHALL offer Sticky (N), Undo and Redo, each with a tooltip naming it and its shortcut. It SHALL NOT show a Select tool (selecting is what the board does when no other tool is on) or tools that don't work yet. Undo and Redo SHALL be unavailable when there is nothing to undo or redo. Every toolbar and zoom-control button SHALL have an accessible label.

#### Scenario: Toolbar contents
- **WHEN** a user opens a Storm
- **THEN** the toolbar shows Sticky, Undo and Redo, and no Select, shape, text, image or connector tools

#### Scenario: Nothing to undo
- **WHEN** a user opens a Storm and has made no changes
- **THEN** Undo and Redo are unavailable

### Requirement: Place a sticky
With the Sticky tool, a click on the board SHALL place a yellow (#F7D000) 200×200 sticky centred on the click point, on top of all other items, select it, and turn the Sticky tool off. Esc SHALL also turn it off. A sticky SHALL NOT be placed beyond 1,000,000 px from the centre.

#### Scenario: Place a sticky
- **WHEN** a user picks Sticky and clicks an empty spot
- **THEN** a yellow 200×200 sticky appears centred there, selected and on top, and the Sticky tool is off again

#### Scenario: Shortcut
- **WHEN** the board has focus and the user presses N and then clicks the board
- **THEN** a sticky is placed at the click point

### Requirement: Select and move stickies
Clicking a sticky SHALL select it and show a thin magenta (#F700A8) outline with a 5 px gap around the sticky; where stickies overlap, the topmost one SHALL be selected. Clicking empty board SHALL clear the selection. Left-dragging on empty board SHALL do nothing else in this release. Dragging a sticky SHALL move it. While a sticky is dragged near the edge of the visible board (including the edge next to the sidebar), the board SHALL pan in that direction so the sticky stays in view. With a sticky selected, the arrow keys SHALL move it 1 px and Shift + arrow 10 px.

#### Scenario: Topmost wins
- **WHEN** two stickies overlap and the user clicks the overlapping area
- **THEN** the sticky placed later is selected

#### Scenario: Deselect
- **WHEN** a sticky is selected and the user clicks empty board
- **THEN** nothing is selected

#### Scenario: Drag
- **WHEN** a user drags a sticky 300 px to the right
- **THEN** the sticky ends 300 px to the right of where it started

#### Scenario: Drag to the edge
- **WHEN** a user drags a sticky to the left edge of the board, next to the sidebar, and holds it there
- **THEN** the board pans so the sticky stays visible under the pointer, and it never ends up hidden under the sidebar

#### Scenario: Nudge
- **WHEN** a sticky is selected and the user presses Shift + →
- **THEN** the sticky moves 10 px to the right

### Requirement: Type in a sticky
Double-clicking a sticky, or pressing Enter with one selected, SHALL start editing its text. Text SHALL be plain, centred, in one fixed size, in the app's font, and text that doesn't fit SHALL be clipped. Esc or clicking outside SHALL finish editing. The text SHALL stay in the same place when editing starts and ends. Sticky text SHALL be at most 500 characters; pasting longer text SHALL keep the first 500. Text SHALL NOT be drawn before its font has loaded.

#### Scenario: Type
- **WHEN** a user double-clicks a sticky, types "Ideas", and presses Esc
- **THEN** the sticky shows "Ideas" centred

#### Scenario: Overflow is clipped
- **WHEN** a user types or pastes more text than fits in a sticky (up to 500 characters) and finishes editing
- **THEN** the text beyond the sticky's edge is not shown, and double-clicking the sticky again shows all of it in the editor

#### Scenario: Paste over the limit
- **WHEN** a user pastes 800 characters into a sticky
- **THEN** the sticky keeps the first 500 characters

#### Scenario: No jump
- **WHEN** a user starts or finishes editing a sticky's text
- **THEN** the text's lines stay in the same position
- **AND** if the editor was scrolled to show text beyond the sticky's edge, finishing returns the text to the top, so the lines are in the same position as before editing

### Requirement: Delete a sticky
Pressing Delete or Backspace with a sticky selected, and not while editing its text, SHALL delete it.

#### Scenario: Delete
- **WHEN** a sticky is selected and the user presses Delete
- **THEN** the sticky is removed from the board

#### Scenario: Backspace while typing
- **WHEN** a user is editing a sticky's text and presses Backspace
- **THEN** a character is removed and the sticky stays
