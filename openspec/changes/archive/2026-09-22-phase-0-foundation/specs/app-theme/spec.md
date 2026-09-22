# Spec Delta

## Purpose

Lets a user view ToughBubble in a light or dark theme, defaulting to their operating system preference and remembering an explicit choice across visits.

## ADDED Requirements

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
