# Spec Delta

## ADDED Requirements

### Requirement: Small-screen panel width
The small-screen sidebar panel SHALL be about 85% of the screen width, and at most 360px wide, leaving a strip of the page visible to tap for closing it.

#### Scenario: Panel on a phone
- **WHEN** a user opens the sidebar on a screen 412px wide
- **THEN** the panel is about 350px wide and a strip of the page stays visible beside it

#### Scenario: Panel on a wider small screen
- **WHEN** a user opens the sidebar on a screen 700px wide
- **THEN** the panel is 360px wide
