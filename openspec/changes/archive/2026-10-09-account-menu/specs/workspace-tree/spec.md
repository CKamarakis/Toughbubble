# Spec Delta

## ADDED Requirements

### Requirement: Account menu
The bottom of the sidebar SHALL show Archive and Trash as links, followed by one account row with the user's avatar initial and email. Choosing the account row SHALL open a menu with Settings, a theme choice of Light, Dark and System showing the current choice, and Sign out. Choosing a theme in the menu SHALL apply it at once, as the theme control does. The sidebar SHALL NOT show separate Settings, theme or Sign out controls. While the Settings page is open, the account row SHALL show the same highlight as the link of the current page. The menu SHALL be usable with the keyboard and SHALL close with Escape, returning focus to the account row.

#### Scenario: Open the account menu
- **WHEN** a user chooses their email at the bottom of the sidebar
- **THEN** a menu opens with Settings, Light, Dark, System and Sign out, and the current theme is marked as chosen

#### Scenario: Change theme from the menu
- **WHEN** a user using the light theme chooses Dark in the account menu
- **THEN** the app switches to the dark theme immediately and the choice is remembered as before

#### Scenario: Sign out from the menu
- **WHEN** a user chooses Sign out in the account menu
- **THEN** they are signed out and taken to the sign-in page

#### Scenario: Compact sidebar footer
- **WHEN** a user views the sidebar
- **THEN** below the tree there are only the Archive and Trash links and the account row

#### Scenario: Settings page highlight
- **WHEN** the Settings page is open
- **THEN** the account row is highlighted like the current page's link

#### Scenario: Keyboard
- **WHEN** a keyboard user focuses the account row, presses Enter, moves to Dark with the arrow keys, and presses Enter
- **THEN** the dark theme is applied. Opening the menu again and pressing Escape closes it and puts focus back on the account row
