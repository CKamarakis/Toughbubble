## MODIFIED Requirements

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

## ADDED Requirements

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
