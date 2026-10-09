# app-theme Specification

## Purpose
Lets a user view ToughBubble in a light or dark theme, defaulting to their operating system preference and remembering an explicit choice across visits.

## Requirements

### Requirement: System theme by default
When the user has not chosen a theme, the system SHALL render in light or dark mode to match the operating system's color-scheme preference.

#### Scenario: OS prefers dark
- **WHEN** a user with no saved theme choice opens the app on a device set to dark mode
- **THEN** the app renders in the dark theme

#### Scenario: OS preference changes while open
- **WHEN** a user with no saved theme choice has the app open and switches the OS color scheme
- **THEN** the app switches to the matching theme without a reload

### Requirement: Manual theme choice
The system SHALL provide a theme control offering Light, Dark, and System, available on the sign-in page and in the workspace.

#### Scenario: User picks a theme
- **WHEN** a user selects Dark in the theme control
- **THEN** the app renders in the dark theme immediately, regardless of OS preference

#### Scenario: User returns to System
- **WHEN** a user selects System in the theme control
- **THEN** the app follows the OS color-scheme preference again

### Requirement: Theme choice persists
The user's theme choice SHALL persist across reloads and browser restarts on the same browser, and the correct theme SHALL be applied before first paint.

#### Scenario: Reload after choosing a theme
- **WHEN** a user who chose Light reloads the app on a device set to dark mode
- **THEN** the app renders in the light theme with no visible flash of the dark theme

### Requirement: Readable text in both themes
Body text in both themes SHALL meet WCAG AA contrast (at least 4.5:1) against its background.

#### Scenario: Contrast check
- **WHEN** body and secondary text colors are measured against their backgrounds in light and dark themes
- **THEN** every pair has a contrast ratio of at least 4.5:1

### Requirement: Visible controls in both themes
Interactive controls and their states SHALL stand out from the surface they sit on with a contrast of at least 3:1 in both themes, as WCAG 1.4.11 requires for non-text UI. This covers the theme control's track and its selected option. The account avatar in the sidebar, though decorative, SHALL meet the same 3:1 so it doesn't read as a stray letter.

#### Scenario: Theme control in the light sidebar
- **WHEN** the workspace is shown in the light theme
- **THEN** the theme control's track is visibly distinct from the sidebar background, and the selected option is distinct from the track

#### Scenario: Avatar in both themes
- **WHEN** the account area is shown in the light theme and then the dark theme
- **THEN** the avatar circle behind the initial is visible against the sidebar in both

### Requirement: Comfortable sizes on touch screens
On devices whose main pointer is touch, the app's interface SHALL be drawn at phone-friendly sizes. Regular interface text (sidebar rows, page titles in lists, menu entries, buttons, breadcrumbs, form fields) SHALL be at least 16px. Secondary text (dates, counts, hints, group labels) SHALL be at least 13px. Sidebar rows, row buttons, menu entries, list rows and page buttons SHALL be at least 44px tall. Note text SHALL keep the size chosen in editor settings. Devices whose main pointer is a mouse or trackpad SHALL keep their current sizes.

#### Scenario: Readable sidebar on a phone
- **WHEN** a user opens the sidebar on a phone
- **THEN** item titles in the sidebar are at least 16px and each row is at least 44px tall

#### Scenario: Readable page lists on a phone
- **WHEN** a user opens a project on a phone
- **THEN** the item titles in its contents list are at least 16px, the dates at least 13px, and each row is at least 44px tall

#### Scenario: Menus on a phone
- **WHEN** a user opens an item's "⋯" menu on a phone
- **THEN** every entry is at least 44px tall with text of at least 16px

#### Scenario: Search does not zoom the page
- **WHEN** a user on an iPhone taps the sidebar search field
- **THEN** the field's text is at least 16px, so the browser does not zoom the page

#### Scenario: Note text unchanged
- **WHEN** a user with a 16px paragraph size in editor settings opens a note on a phone
- **THEN** the note's paragraphs are 16px

#### Scenario: Desktop unchanged
- **WHEN** a user with a mouse views the app
- **THEN** text, rows and buttons have the same sizes as before this change
