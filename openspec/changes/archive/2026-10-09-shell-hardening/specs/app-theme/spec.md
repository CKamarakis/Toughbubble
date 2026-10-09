# Spec Delta

## ADDED Requirements

### Requirement: Visible controls in both themes
Interactive controls and their states SHALL stand out from the surface they sit on with a contrast of at least 3:1 in both themes, as WCAG 1.4.11 requires for non-text UI. This covers the theme control's track and its selected option. The account avatar in the sidebar, though decorative, SHALL meet the same 3:1 so it doesn't read as a stray letter.

#### Scenario: Theme control in the light sidebar
- **WHEN** the workspace is shown in the light theme
- **THEN** the theme control's track is visibly distinct from the sidebar background, and the selected option is distinct from the track

#### Scenario: Avatar in both themes
- **WHEN** the account area is shown in the light theme and then the dark theme
- **THEN** the avatar circle behind the initial is visible against the sidebar in both
