# workspace-data Specification

## Purpose
Defines who owns workspace data and the integrity rules the stored item tree and item content must always satisfy, so each user's workspace stays private and consistent regardless of which feature writes to it.

## Requirements
### Requirement: Data ownership
Every workspace item and every piece of item content SHALL belong to exactly one user. The owner SHALL be the signed-in user who created it and SHALL NOT be settable to another user.

#### Scenario: Item created by a user
- **WHEN** a signed-in user creates an item
- **THEN** the item is owned by that user

#### Scenario: Attempt to create data for another user
- **WHEN** a signed-in user attempts to create an item or content with another user's identity as owner
- **THEN** the system rejects the write and stores nothing

### Requirement: Data isolation
A user SHALL only be able to read, create, change, or delete their own data. Isolation SHALL be enforced by the database for every request made on a user's behalf, so an application query that omits an owner filter still cannot reach another user's data.

#### Scenario: Reading another user's item
- **WHEN** user A requests an item owned by user B, by id or through any list query
- **THEN** the system returns no data for that item, as if it did not exist

#### Scenario: Changing another user's item
- **WHEN** user A attempts to update or delete an item or content owned by user B
- **THEN** no row is changed and user B's data is unaffected

#### Scenario: Query without an owner filter
- **WHEN** a request made on user A's behalf lists all items without filtering by owner
- **THEN** only user A's items are returned

#### Scenario: Request without a session
- **WHEN** a data request is made without a valid session
- **THEN** the system returns no workspace data and changes nothing

### Requirement: Item kinds and statuses
Every item SHALL have a kind of `project`, `folder`, `note`, or `storm`, and a status of `active`, `archived`, or `trashed`. New items SHALL start as `active`.

#### Scenario: New item status
- **WHEN** a user creates an item without specifying a status
- **THEN** the item's status is `active`

#### Scenario: Invalid kind or status
- **WHEN** a write sets an item's kind or status to a value outside the allowed sets
- **THEN** the system rejects the write

### Requirement: Parent belongs to the same owner
An item's parent, when present, SHALL be an item owned by the same user. An item with no parent is a root-level item.

#### Scenario: Root-level item
- **WHEN** a user creates an item with no parent
- **THEN** the item is stored as a root-level item

#### Scenario: Parent owned by another user
- **WHEN** a write sets an item's parent to an item owned by a different user
- **THEN** the system rejects the write

### Requirement: Content belongs to its item's owner
Content for a note or Storm SHALL be stored separately from the item, at most one content record per item, owned by the same user as the item.

#### Scenario: Content for another user's item
- **WHEN** a write attempts to create content for an item owned by a different user
- **THEN** the system rejects the write

#### Scenario: Second content record for the same item
- **WHEN** a write attempts to create a second content record for an item that already has one
- **THEN** the system rejects the write

### Requirement: Permanent deletion removes dependent data
Permanently deleting an item SHALL also permanently delete its content, its attached files and their records, and all of its descendant items with their content and attached files.

#### Scenario: Deleting a folder with children
- **WHEN** a folder containing a note (with content) is permanently deleted
- **THEN** the folder, the note, and the note's content no longer exist

#### Scenario: Deleting a note with attachments
- **WHEN** a note with an attached image is permanently deleted
- **THEN** the image's record and its stored file no longer exist

### Requirement: Content version counter
Each content record SHALL carry a version number that starts at 1 when the content is created.

#### Scenario: New content version
- **WHEN** content is created for a note or Storm
- **THEN** its version is 1

### Requirement: Account deletion removes all user data
Deleting a user's account SHALL permanently delete all of that user's items and content.

#### Scenario: Account removed
- **WHEN** a user's account is deleted
- **THEN** no items or content owned by that user remain

### Requirement: Only containers have children
Only projects and folders SHALL be able to contain items. The database SHALL reject any write that places an item inside a note or a Storm, or that turns an item with children into a note or a Storm.

#### Scenario: Item placed inside a note
- **WHEN** a write sets an item's parent to a note or a Storm
- **THEN** the system rejects the write

#### Scenario: Container with children changes kind
- **WHEN** a write changes a folder that has children into a note
- **THEN** the system rejects the write

### Requirement: No cycles in the tree
The database SHALL reject any write that would make an item its own ancestor.

#### Scenario: Folder moved into its own descendant
- **WHEN** a write sets a folder's parent to a folder inside it
- **THEN** the system rejects the write and the tree is unchanged

#### Scenario: Item made its own parent
- **WHEN** a write sets an item's parent to the item itself
- **THEN** the system rejects the write

### Requirement: New and moved items go under active parents
The database SHALL reject creating an active item, or moving an active item, under a parent that is archived or trashed.

#### Scenario: Create inside a trashed folder
- **WHEN** a write creates an active note whose parent folder is in Trash
- **THEN** the system rejects the write

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
