# storm-board Specification

## Purpose
Lets a user work on a Storm, an always-light infinite board: zoom and pan, place, select, move, type in, colour, copy, paste, duplicate and delete sticky notes, with the board fast at 1,000 stickies.

## Requirements

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
Double-clicking a sticky, or pressing Enter with one selected, SHALL start editing its text. Text SHALL be plain, centred, in the app's font, and SHALL be drawn at the largest whole-pixel size from 8 px to 64 px (board px) at which all of it fits inside the sticky's padding. Text that doesn't fit even at 8 px SHALL be clipped. The size SHALL update while typing, and the editor SHALL use the same size, so the text stays in the same place when editing starts and ends. The fitted size SHALL be saved with the sticky. Esc or clicking outside SHALL finish editing. Sticky text SHALL be at most 500 characters; pasting longer text SHALL keep the first 500. Text SHALL NOT be drawn before its font has loaded.

#### Scenario: Type
- **WHEN** a user double-clicks a sticky, types "Ideas", and presses Esc
- **THEN** the sticky shows "Ideas" centred

#### Scenario: Short text is large
- **WHEN** a user types "Hi" into an empty 200×200 sticky
- **THEN** the text is drawn at 64 px

#### Scenario: Long text gets smaller
- **GIVEN** a sticky whose text fits at 40 px
- **WHEN** the user keeps typing until it no longer fits at 40 px
- **THEN** the text shrinks to the largest size at which it fits, and the editor shows it at that size while typing

#### Scenario: Overflow is clipped
- **WHEN** a user types or pastes more text than fits in a sticky even at 8 px (up to 500 characters) and finishes editing
- **THEN** the text is drawn at 8 px, the text beyond the sticky's edge is not shown, and double-clicking the sticky again shows all of it in the editor

#### Scenario: Paste over the limit
- **WHEN** a user pastes 800 characters into a sticky
- **THEN** the sticky keeps the first 500 characters

#### Scenario: Older long text
- **GIVEN** a sticky saved with more than 500 characters before the limit existed
- **WHEN** its Storm opens
- **THEN** the sticky shows its first 500 characters, and the shortened text is saved with the sticky's next change

#### Scenario: No jump
- **WHEN** a user starts or finishes editing a sticky's text
- **THEN** the text's lines stay in the same position and size; when the editor was scrolled to show text beyond the sticky's edge, finishing returns the text to the top

#### Scenario: Older stickies
- **GIVEN** a sticky saved before fitted sizes existed (no stored size)
- **WHEN** the board opens
- **THEN** its text is drawn at its fitted size, and the size is saved the next time the sticky changes

### Requirement: Delete a sticky
Pressing Delete or Backspace with a sticky selected, and not while editing its text, SHALL delete it.

#### Scenario: Delete
- **WHEN** a sticky is selected and the user presses Delete
- **THEN** the sticky is removed from the board

#### Scenario: Backspace while typing
- **WHEN** a user is editing a sticky's text and presses Backspace
- **THEN** a character is removed and the sticky stays

### Requirement: Sticky colour
A sticky SHALL have one of 13 preset colours, in this order: Yellow #F7D000, Light yellow #FFF0A0, Pink #FFC6E8, Magenta #FF8AD8, Lavender #F3DDFF, Purple #D3A1FF, Sky blue #BBF0FF, Light blue #B3CEFF, Dark blue #3263C3, Light green #D4F3C4, Dark green #008135, Black #141310 and White #FFFFFF. Text SHALL be #333129 on every colour except Dark blue, Dark green and Black, which SHALL have #FFFFFF text. A white sticky SHALL show a thin neutral border so it stays visible on the board. Changing a sticky's colour SHALL be one undo step and SHALL be saved like any other change. A sticky with no stored colour SHALL be yellow. A sticky stored with a colour that is no longer a preset (Orange, Red, the earlier Pink or Brown from the first palette) SHALL be shown in the nearest preset (Light yellow, Pink, Pink and Light yellow) and saved that way the next time it changes.

#### Scenario: Pick a colour
- **GIVEN** a yellow sticky is selected
- **WHEN** the user opens the colour palette in the sticky toolbar and picks Pink
- **THEN** the sticky turns pink, the palette shows Pink as the current colour, and the change is saved

#### Scenario: Colour from the first palette
- **GIVEN** a sticky saved as Orange #FFDEB9
- **WHEN** the board opens
- **THEN** the sticky shows as Light yellow, and its next change saves it as Light yellow

#### Scenario: Readable text on dark colours
- **WHEN** a user picks Black for a sticky with text
- **THEN** the text is drawn white

#### Scenario: Undo a colour change
- **WHEN** a user turns a sticky pink and presses Ctrl+Z
- **THEN** the sticky is yellow again

#### Scenario: New stickies use the last colour
- **GIVEN** the user just turned a sticky pink
- **WHEN** they place a new sticky
- **THEN** the new sticky is pink

### Requirement: Sticky colour on creation
New stickies SHALL be placed in the last colour the user picked, whether in the sticky toolbar or in the Sticky tool's palette. That colour SHALL be remembered per user in this browser and SHALL start as Yellow. Turning the Sticky tool on (its toolbar button or N) SHALL open a palette next to the Sticky button showing the same presets, with the colour new stickies will get marked. Picking a colour there SHALL set the colour for new stickies and keep the Sticky tool on; the next click on the board places a sticky in that colour. The palette SHALL close when the tool turns off, after a sticky is placed, or on Esc (which also turns the tool off). It SHALL be usable with the keyboard like the sticky toolbar's palette and SHALL stay light in the dark app theme.

#### Scenario: Pick the colour before placing
- **WHEN** a user clicks the Sticky button, picks Light green in the palette that opens, and clicks the board
- **THEN** a light green sticky is placed there and the palette closes

#### Scenario: Remembered after a reload
- **GIVEN** the user last picked Purple
- **WHEN** they reload the page and place a sticky with N and a click
- **THEN** the new sticky is purple

#### Scenario: First use
- **WHEN** a user who has never picked a colour places a sticky
- **THEN** it is yellow

### Requirement: Sticky toolbar
When exactly one sticky is selected, and it is not being edited or dragged and the board is not being panned, a small toolbar SHALL appear centred above the sticky (below it when there is no room above), following the sticky as the board pans and zooms. In this change it SHALL hold one button, Colour, showing the current colour, which opens the palette as a grid of labelled swatches with the current colour marked. The toolbar and palette SHALL stay light in the dark app theme, SHALL be usable with the keyboard (Tab to the button, Enter or Space to open, arrow keys between swatches, Enter to pick, Esc to close), and every swatch SHALL have an accessible name. Using the toolbar SHALL NOT deselect the sticky.

#### Scenario: Toolbar follows the selection
- **WHEN** a user selects a sticky
- **THEN** the toolbar appears above it, and it disappears when the selection is cleared

#### Scenario: Hidden while typing or dragging
- **WHEN** a user starts editing the selected sticky's text or drags it
- **THEN** the toolbar is hidden until editing or dragging ends

#### Scenario: Palette by keyboard
- **WHEN** a user tabs to the Colour button, presses Enter, moves with the arrow keys to Purple and presses Enter
- **THEN** the sticky turns purple, the palette closes with focus back on the Colour button, and new stickies will be purple

### Requirement: Copy, paste and duplicate
While the board has focus and no sticky's text is being edited, Ctrl or ⌘ + C SHALL copy the selected sticky (its text, colour and fitted size), Ctrl or ⌘ + V SHALL paste it as a new sticky centred on the mouse pointer when the pointer is over the board, or at the centre of the view otherwise, and Ctrl or ⌘ + D SHALL duplicate the selected sticky as a new sticky directly to its right with a 20 px gap. A copy SHALL be pasteable in the same Storm, in another Storm and in another tab of the same browser. Pasting plain text copied from outside the board SHALL create a new sticky with that text (its first 500 characters) in the colour for new stickies. Each paste or duplicate SHALL be one undo step and SHALL leave the new sticky on top and selected. With a sticky selected, Ctrl or ⌘ + D SHALL NOT open the browser's bookmark dialog. A new sticky SHALL NOT be placed beyond 1,000,000 px from the centre. While a sticky's text is being edited, these keys SHALL act on the text as usual.

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
