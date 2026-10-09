# Spec Delta

## ADDED Requirements

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
