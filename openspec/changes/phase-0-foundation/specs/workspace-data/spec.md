# Spec Delta

## Purpose

Defines who owns workspace data and the integrity rules the stored item tree and item content must always satisfy, so each user's workspace stays private and consistent regardless of which feature writes to it.

## ADDED Requirements

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
Permanently deleting an item SHALL also permanently delete its content and all of its descendant items and their content.

#### Scenario: Deleting a folder with children
- **WHEN** a folder containing a note (with content) is permanently deleted
- **THEN** the folder, the note, and the note's content no longer exist

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
