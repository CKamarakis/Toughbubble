# Spec Delta

## ADDED Requirements

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
