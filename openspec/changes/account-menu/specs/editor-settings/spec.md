# Spec Delta

## MODIFIED Requirements

### Requirement: Settings page
The workspace SHALL have a Settings page reachable from the account menu in the sidebar. It SHALL include an Editor section listing Paragraph and Heading 1 to Heading 6, each with its font size, its Light and Dark colors, and a preview of how that text looks in the light and in the dark theme. The Editor section SHALL say that changes apply to every note.

#### Scenario: Open settings
- **WHEN** a signed-in user opens the account menu in the sidebar and chooses Settings
- **THEN** the Settings page opens with an Editor section listing Paragraph and Heading 1 to Heading 6, each showing its current size, its Light and Dark colors, and a preview in both themes

#### Scenario: Preview both themes
- **WHEN** a user sets Heading 1's Dark color to yellow while using the light theme
- **THEN** the Heading 1 dark-theme preview shows yellow text on a dark background, and the light-theme preview is unchanged
