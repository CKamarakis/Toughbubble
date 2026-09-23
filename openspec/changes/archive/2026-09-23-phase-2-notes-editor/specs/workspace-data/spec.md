# Spec Delta

## ADDED Requirements

### Requirement: Versioned content saves
Every save of an item's content SHALL state the version it is based on (0 when the item has no content yet). The save SHALL succeed only if that version is still the stored one, and a successful save SHALL increase the stored version by exactly 1. A save based on any other version SHALL change nothing and report the stored version.

#### Scenario: First save
- **WHEN** content is saved for a note that has none, based on version 0
- **THEN** the content is stored with version 1

#### Scenario: Next save
- **WHEN** content stored at version 3 is saved based on version 3
- **THEN** the new content is stored with version 4

#### Scenario: Stale save
- **WHEN** content stored at version 4 is saved based on version 3
- **THEN** nothing is changed and the save reports that the stored version is 4

#### Scenario: Only notes take a body
- **WHEN** a write saves body content for a project, folder, or an archived or trashed note
- **THEN** the system rejects the save and stores nothing
