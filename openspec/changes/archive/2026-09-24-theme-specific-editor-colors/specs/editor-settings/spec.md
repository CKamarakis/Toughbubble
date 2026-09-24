# Spec Delta

## MODIFIED Requirements

### Requirement: Settings page
The workspace SHALL have a Settings page reachable from the sidebar. It SHALL include an Editor section listing Paragraph and Heading 1 to Heading 6, each with its font size, its Light and Dark colors, and a preview of how that text looks in the light and in the dark theme. The Editor section SHALL say that changes apply to every note.

#### Scenario: Open settings
- **WHEN** a signed-in user chooses Settings in the sidebar
- **THEN** the Settings page opens with an Editor section listing Paragraph and Heading 1 to Heading 6, each showing its current size, its Light and Dark colors, and a preview in both themes

#### Scenario: Preview both themes
- **WHEN** a user sets Heading 1's Dark color to yellow while using the light theme
- **THEN** the Heading 1 dark-theme preview shows yellow text on a dark background, and the light-theme preview is unchanged

### Requirement: Element color
A user SHALL be able to set the text color of each element separately for the light theme and the dark theme using the color picker, or leave either on Automatic, which follows that theme's text color. Notes SHALL use the color for the theme being shown, and switching themes SHALL switch colors without reloading. A color set before per-theme colors existed SHALL apply to both themes until the user changes it.

#### Scenario: Color headings
- **WHEN** a user sets Heading 2's Light color to purple
- **THEN** every level-2 heading in their notes is shown in purple in the light theme

#### Scenario: Different colors per theme
- **WHEN** a user sets Heading 1's Light color to dark blue and its Dark color to yellow, then switches from the light to the dark theme
- **THEN** level-1 headings change from dark blue to yellow

#### Scenario: Automatic color
- **WHEN** an element's color for a theme is Automatic
- **THEN** its text uses that theme's normal text color

#### Scenario: One theme set
- **WHEN** a user sets only Heading 3's Dark color to green
- **THEN** level-3 headings are green in the dark theme and use the normal text color in the light theme

#### Scenario: Existing color kept
- **WHEN** a user who set Heading 2 to purple before this change opens a note
- **THEN** level-2 headings are purple in both themes, and Settings shows purple as both the Light and the Dark color

### Requirement: Color picker
The color picker SHALL show the user's saved colors first, followed by nine preset colors in two rows: Black, White, Yellow, Red, Pink, Purple, Blue, Light blue, and Green. Where the context allows it (such as editor settings), an Automatic option SHALL fill the tenth slot of the preset rows. A button SHALL let the user add a custom color with a color field or a typed hex code. The picker SHALL mark the selected color, be operable with the keyboard, and warn when a chosen color is hard to read against the background it will be shown on, while still allowing it. When a picker sets a color for one theme only (such as an element's Light or Dark color), the warning SHALL consider only that theme's background; otherwise it SHALL consider both.

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
- **WHEN** a user picks a color with contrast below 4.5:1 against the light or the dark page background in a picker used for both themes
- **THEN** the picker warns which theme it is hard to read in, and the color can still be used

#### Scenario: Warning for the theme being edited
- **WHEN** a user picks yellow as Heading 1's Dark color
- **THEN** no warning is shown, because yellow reads well on the dark background

#### Scenario: Warning in the other theme
- **WHEN** a user picks yellow as Heading 1's Light color
- **THEN** the picker warns that it is hard to read in the light theme, and the color can still be used

### Requirement: Settings saved to the account
Editor settings SHALL be saved automatically to the user's account and apply on every device and browser they sign in on. After each change to an element's size or color, the user SHALL see a short message naming the element (and the theme, for a color) with an Undo action that restores the previous value. A user SHALL be able to reset one element, or all elements, to the built-in defaults.

#### Scenario: Same settings on another device
- **WHEN** a user changes Heading 3 to 26 px and later signs in on another device
- **THEN** level-3 headings there are shown at 26 px

#### Scenario: Undo a change
- **WHEN** a user sets Heading 1's Light color to red and chooses Undo in the message that appears
- **THEN** Heading 1's Light color returns to what it was, in the preview, in notes, and in the saved settings

#### Scenario: Reset one element
- **WHEN** a user chooses Reset on Heading 1
- **THEN** Heading 1 returns to 36 px and Automatic color in both themes, and other elements keep their settings

#### Scenario: Reset all
- **WHEN** a user chooses Reset all and confirms
- **THEN** every element returns to its built-in size and Automatic color in both themes

#### Scenario: Private to the user
- **WHEN** another user is signed in
- **THEN** they cannot read or change this user's settings
