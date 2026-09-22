# Spec Delta

## Purpose

Lets a person create a ToughBubble account with an email address and password, sign in and stay signed in across visits, recover a forgotten password, and sign out, while keeping every workspace page closed to anyone without a session.

## ADDED Requirements

### Requirement: Email and password sign-up
The system SHALL let any visitor create an account with an email address and a password of at least 8 characters containing a lowercase letter, an uppercase letter, a number, and a symbol. Email and password SHALL be the only sign-in method offered.

#### Scenario: Successful sign-up
- **WHEN** a visitor submits the sign-up form with a valid email address and a password that meets the password rules
- **THEN** the system creates the account, sends a confirmation email to that address, and tells the visitor to check their email

#### Scenario: Password does not meet the rules
- **WHEN** a visitor submits the sign-up form with a password that is shorter than 8 characters or lacks a lowercase letter, an uppercase letter, a number, or a symbol
- **THEN** the system does not create an account and shows a message naming what is missing

#### Scenario: Email already registered
- **WHEN** a visitor signs up with an email address that already has an account
- **THEN** the system shows the same "check your email" message as a successful sign-up, without revealing that the account exists

### Requirement: Email confirmation
A new account SHALL NOT be able to sign in until its email address is confirmed through the link sent by email.

#### Scenario: Confirmation link opened
- **WHEN** a person opens a valid confirmation link from their email
- **THEN** the system confirms the account, signs them in, and shows their workspace

#### Scenario: Invalid or expired confirmation link
- **WHEN** a person opens a confirmation link that is invalid, already used, or expired
- **THEN** the system shows the sign-in page with a message that the link is invalid or expired

#### Scenario: Sign-in before confirming
- **WHEN** a person with an unconfirmed account submits the correct email and password
- **THEN** the system does not sign them in, tells them to confirm their email first, and offers to resend the confirmation email

### Requirement: Email and password sign-in
The system SHALL let a person with a confirmed account sign in with their email address and password.

#### Scenario: Successful sign-in
- **WHEN** a person submits the correct email and password for a confirmed account
- **THEN** the system signs them in and shows their workspace

#### Scenario: Wrong email or password
- **WHEN** a person submits an email and password that do not match a confirmed account
- **THEN** the system shows "Email or password is incorrect" without revealing which one was wrong or whether the account exists, and no session is created

### Requirement: New user starts with an empty workspace
A user's first successful sign-in SHALL give them a private workspace containing no items.

#### Scenario: First visit to workspace
- **WHEN** a user signs in for the first time
- **THEN** their workspace shows no projects, folders, notes, or Storms

### Requirement: Password reset
The system SHALL let a person who forgot their password set a new one through a link sent to their email address.

#### Scenario: Reset requested
- **WHEN** a person requests a password reset for an email address
- **THEN** the system shows a message that a reset link has been sent if an account exists, whether or not it does, and sends the link only if it does

#### Scenario: New password set through the link
- **WHEN** a person opens a valid reset link and submits a new password that meets the password rules
- **THEN** the system saves the new password, signs them in, and shows their workspace

#### Scenario: Invalid or expired reset link
- **WHEN** a person opens a reset link that is invalid, already used, or expired
- **THEN** the system shows the sign-in page with a message that the link is invalid or expired, and the password is unchanged

### Requirement: Protected routes
Every page and data endpoint except the sign-in, sign-up, and forgot-password pages and the email-link handlers SHALL require a valid session.

#### Scenario: Visitor without a session opens the app
- **WHEN** a visitor without a session requests any workspace page
- **THEN** the system redirects them to the sign-in page

#### Scenario: Return to requested page after sign-in
- **WHEN** a visitor is redirected to sign-in from a workspace page and then signs in successfully
- **THEN** the system takes them to the page they originally requested

#### Scenario: Signed-in user opens a sign-in or sign-up page
- **WHEN** a user with a valid session requests the sign-in, sign-up, or forgot-password page
- **THEN** the system redirects them to their workspace

### Requirement: Session persistence
A signed-in user's session SHALL survive page reloads and browser restarts until they sign out or the session expires.

#### Scenario: Reload keeps the user signed in
- **WHEN** a signed-in user reloads the page or reopens the browser
- **THEN** they remain signed in without entering their password again

#### Scenario: Expired session
- **WHEN** a user's session has expired and cannot be refreshed
- **THEN** the next workspace request redirects them to the sign-in page

### Requirement: Sign-out
The system SHALL let a signed-in user sign out from the workspace.

#### Scenario: User signs out
- **WHEN** a signed-in user chooses "Sign out"
- **THEN** the system ends their session and shows the sign-in page

#### Scenario: Back button after sign-out
- **WHEN** a user signs out and then navigates back to a workspace page
- **THEN** the system redirects them to the sign-in page instead of showing workspace data
