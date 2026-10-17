## MODIFIED Requirements

### Requirement: Server checks
The server SHALL accept board saves only for the signed-in user's own active Storms, and SHALL reject malformed changes: unknown item types or fields, ids that aren't UUIDs, the same id twice or in both the changed and deleted lists, non-finite or out-of-range positions and sizes, widths or heights of zero or less, text over 500 characters, a colour that is not one of the sticky presets, a fitted font size that is not a whole number from 8 to 64, more than 5,000 entries in a list, or a change set over 800 KB. A sticky's colour and fitted font size SHALL be optional. A pending change set larger than 800 KB SHALL be sent as several saves in order.

#### Scenario: Someone else's storm
- **WHEN** a request tries to save changes to another user's Storm
- **THEN** it is refused as not found and that Storm is unchanged

#### Scenario: A note's id
- **WHEN** a request sends board changes with a note's id
- **THEN** it is refused as not found and the note's body is unchanged

#### Scenario: Malformed change
- **WHEN** a request sends a sticky with a non-numeric position
- **THEN** it is refused and the stored board is unchanged

#### Scenario: Unknown colour
- **WHEN** a request sends a sticky with the colour "#123456"
- **THEN** it is refused and the stored board is unchanged

#### Scenario: Older sticky without style
- **WHEN** a request sends a sticky without a colour or fitted size
- **THEN** it is accepted
