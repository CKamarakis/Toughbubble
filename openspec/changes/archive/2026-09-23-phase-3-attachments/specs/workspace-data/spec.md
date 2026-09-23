# Spec Delta

## MODIFIED Requirements

### Requirement: Permanent deletion removes dependent data
Permanently deleting an item SHALL also permanently delete its content, its attached files and their records, and all of its descendant items with their content and attached files.

#### Scenario: Deleting a folder with children
- **WHEN** a folder containing a note (with content) is permanently deleted
- **THEN** the folder, the note, and the note's content no longer exist

#### Scenario: Deleting a note with attachments
- **WHEN** a note with an attached image is permanently deleted
- **THEN** the image's record and its stored file no longer exist
