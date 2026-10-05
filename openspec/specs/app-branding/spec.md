# app-branding Specification

## Purpose
Gives ToughBubble a visible identity: where its logo appears in the app, how the logo adapts to the light and dark themes, and which icons browsers and home screens show.

## Requirements
### Requirement: Logo on the auth pages
The sign-in, sign-up, and forgot-password pages SHALL show the ToughBubble logo on its black disc to the left of the "ToughBubble" wordmark, sized to the wordmark (about 40px) and centred vertically on it. The wordmark SHALL be about 32px in a light (300) weight and SHALL NOT be a heading: each page keeps its own level-1 heading naming the task (for example "Sign in").

#### Scenario: Signed-out visitor opens sign-in
- **WHEN** a signed-out visitor opens the sign-in page
- **THEN** the disc logo is shown left of the "ToughBubble" wordmark, the pair centred above the form card, and reads clearly in both the light and dark themes

#### Scenario: Other auth pages
- **WHEN** a visitor opens the sign-up or forgot-password page
- **THEN** the same logo appears in the same position as on sign-in

#### Scenario: Page heading
- **WHEN** a screen-reader user jumps to the first heading on the sign-in page
- **THEN** they land on "Sign in", not on the wordmark

### Requirement: Logo in the sidebar header
The workspace sidebar header SHALL show the logo to the left of the "ToughBubble" name (in a light, 300 weight), no taller than the name's line height and centred vertically on it. Logo and name SHALL form one link to the workspace home.

#### Scenario: Logo aligns with the name
- **WHEN** a signed-in user views the sidebar
- **THEN** the logo's vertical centre lines up with the "ToughBubble" text, and the logo does not make the header row taller than it was with the name alone

#### Scenario: Clicking the logo
- **WHEN** the user clicks the logo in the sidebar header
- **THEN** the app navigates to the workspace home, just as clicking the name does

### Requirement: Logo adapts to the theme
The sidebar logo's connector lines SHALL be light in the dark theme and dark in the light theme, so the dots stay visibly connected on either background. The correct variant SHALL be shown from first paint, with no flash of the other variant, including right after the user switches theme.

#### Scenario: Light theme
- **WHEN** the app renders in the light theme
- **THEN** the logo's connector lines are drawn in the dark text colour and are clearly visible against the light background

#### Scenario: Dark theme
- **WHEN** the app renders in the dark theme
- **THEN** the logo's connector lines are drawn in white

#### Scenario: Theme switched while open
- **WHEN** the user switches between Light and Dark in the theme control
- **THEN** the logo switches to the matching variant immediately, without a reload

### Requirement: Logo is decorative to assistive technology
Wherever the logo sits next to the visible "ToughBubble" wordmark, it SHALL be hidden from assistive technology, so screen readers announce the name once.

#### Scenario: Screen reader on the sidebar link
- **WHEN** a screen reader focuses the sidebar home link
- **THEN** it announces "ToughBubble" once, with no separate image description

### Requirement: Browser and home-screen icons
The app SHALL provide a favicon, a PNG icon, and an Apple touch icon, all made from the ToughBubble logo on its black disc so the icon stays legible on light and dark browser chrome. The default framework favicon SHALL no longer be served.

#### Scenario: Browser tab
- **WHEN** any app page is open in a browser tab
- **THEN** the tab shows the ToughBubble disc icon, not the framework default

#### Scenario: Signed-out icon request
- **WHEN** a signed-out visitor's browser requests the icons
- **THEN** the icons load without an auth redirect

#### Scenario: Add to home screen on iOS
- **WHEN** a user adds the app to an iOS home screen
- **THEN** the home-screen icon is the ToughBubble disc logo
