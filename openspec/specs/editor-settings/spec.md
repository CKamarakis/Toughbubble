# editor-settings Specification

## Purpose
Lets a user set the default font size and color of each kind of text in their notes (paragraphs and headings 1 to 6) from a settings page, using a color picker that offers common colors and any custom color.

## Requirements
### Requirement: Settings page
The workspace SHALL have a Settings page reachable from the sidebar. It SHALL include an Editor section listing Paragraph and Heading 1 to Heading 6, each with its font size and color and a preview of how that text looks.

#### Scenario: Open settings
- **WHEN** a signed-in user chooses Settings in the sidebar
- **THEN** the Settings page opens with an Editor section listing Paragraph and Heading 1 to Heading 6, each showing its current size, color, and a preview

### Requirement: Element font size
A user SHALL be able to set the default font size of each element to any whole-pixel size from 8 to 96. Until changed, each element SHALL use the built-in default (Paragraph 16, Heading 1 to 6: 36, 30, 24, 20, 18, 16).

#### Scenario: Change the Heading 1 size
- **WHEN** a user sets Heading 1 to 40
- **THEN** every level-1 heading in their notes without its own size is shown at 40 px, including notes already written

#### Scenario: Size out of range
- **WHEN** a user enters 120 for Paragraph
- **THEN** the size is not saved and the field indicates the allowed range of 8 to 96

#### Scenario: Own size wins
- **WHEN** a user changes the Paragraph default to 18 while a word in a note has its own size of 24
- **THEN** the paragraph is shown at 18 px and that word stays at 24 px

### Requirement: Element color
A user SHALL be able to set the text color of each element using the color picker, or leave it on Automatic, which follows the theme's text color.

#### Scenario: Color headings
- **WHEN** a user sets Heading 2 to purple
- **THEN** every level-2 heading in their notes is shown in purple

#### Scenario: Automatic color
- **WHEN** an element's color is Automatic
- **THEN** its text uses the theme's normal text color in both light and dark mode

### Requirement: Color picker
The color picker SHALL show the user's saved colors first, followed by nine preset colors in two rows: Black, White, Yellow, Red, Pink, Purple, Blue, Light blue, and Green. Where the context allows it (such as editor settings), an Automatic option SHALL fill the tenth slot of the preset rows. A button SHALL let the user add a custom color with a color field or a typed hex code. The picker SHALL mark the selected color, be operable with the keyboard, and warn when a chosen color is hard to read against the light or dark background, while still allowing it.

#### Scenario: Layout
- **WHEN** a user opens the picker
- **THEN** their saved colors appear first, then the preset colors in two rows of five with Automatic as the last slot, and every swatch is visible without scrolling

#### Scenario: Pick a preset
- **WHEN** a user opens the picker and clicks a preset swatch
- **THEN** that color is selected and marked in the grid

#### Scenario: Custom hex
- **WHEN** a user chooses to add a color and types "#1a7f5a" into the hex field
- **THEN** that color is selected and added to the user's saved colors

#### Scenario: Invalid hex
- **WHEN** a user types "#12zz99"
- **THEN** the color is not applied and the field shows it is not a valid color

#### Scenario: Hard-to-read color
- **WHEN** a user picks a color with contrast below 4.5:1 against the light or the dark page background
- **THEN** the picker warns which theme it is hard to read in, and the color can still be used

### Requirement: Saved colors
Custom colors a user adds SHALL be saved to their account and offered first in every color picker, newest first, on every device. Adding a color that is already saved SHALL not duplicate it. A user SHALL be able to remove a saved color; removing it SHALL NOT change anything that already uses that color.

#### Scenario: Saved color offered everywhere
- **WHEN** a user adds "#1a7f5a" in the picker for Heading 2 and then opens the picker for Paragraph, on the same or another device
- **THEN** "#1a7f5a" is shown first among the colors

#### Scenario: No duplicates
- **WHEN** a user adds a color that is already among their saved colors
- **THEN** the saved colors list still contains it once, now in first place

#### Scenario: Remove a saved color
- **WHEN** a user removes a saved color that Heading 2 is using
- **THEN** it disappears from the picker, and Heading 2 keeps that color

### Requirement: Settings saved to the account
Editor settings SHALL be saved automatically to the user's account and apply on every device and browser they sign in on. A user SHALL be able to reset one element, or all elements, to the built-in defaults.

#### Scenario: Same settings on another device
- **WHEN** a user changes Heading 3 to 26 px and later signs in on another device
- **THEN** level-3 headings there are shown at 26 px

#### Scenario: Reset one element
- **WHEN** a user chooses Reset on Heading 1
- **THEN** Heading 1 returns to 36 px and Automatic color, and other elements keep their settings

#### Scenario: Reset all
- **WHEN** a user chooses Reset all and confirms
- **THEN** every element returns to its built-in size and Automatic color

#### Scenario: Private to the user
- **WHEN** another user is signed in
- **THEN** they cannot read or change this user's settings
