# Spec Delta

## Purpose

Lets a user clear items out of their way without losing them: archiving hides finished work, Trash holds items on their way out, and both can be restored, with whole subtrees moving together.

## ADDED Requirements

### Requirement: Archive items
A user SHALL be able to archive any active item. Archiving SHALL also archive every active item inside it, and all of them SHALL disappear from the sidebar tree.

#### Scenario: Archive a project
- **WHEN** a user archives a project containing a folder with two notes
- **THEN** the project, folder, and notes disappear from the tree, and the project appears in the Archive view

### Requirement: Move items to Trash
A user SHALL be able to move any active or archived item to Trash. Doing so SHALL also move every item inside it that is not already in Trash, and all of them SHALL disappear from the tree and the Archive view.

#### Scenario: Trash a folder
- **WHEN** a user moves a folder containing a note to Trash
- **THEN** the folder and note disappear from the tree, and the folder appears in the Trash view

#### Scenario: Trash an archived item
- **WHEN** a user moves an archived project to Trash from the Archive view
- **THEN** it leaves the Archive view and appears in the Trash view

### Requirement: Archive and Trash views
The sidebar SHALL link to an Archive view and a Trash view. Each SHALL list the items that were archived or trashed directly, not the items inside them, with each item's kind, title, and when it was archived or trashed, newest first.

#### Scenario: Only the item acted on is listed
- **WHEN** a user trashes a folder containing three notes
- **THEN** the Trash view lists the folder once, and not the three notes separately

#### Scenario: Items acted on separately are listed separately
- **WHEN** a user trashes a note, then later trashes the folder that contained it
- **THEN** the Trash view lists both the folder and the note

### Requirement: Restore
A user SHALL be able to restore an item from the Archive or Trash view. Restoring SHALL bring back the item and everything that was archived or trashed together with it, in their original places. If the item's original parent is no longer active, the item SHALL be restored to the root level.

#### Scenario: Restore a trashed folder
- **WHEN** a user restores a folder that was trashed with two notes inside
- **THEN** the folder and both notes reappear in the tree in their original place and order

#### Scenario: Separately trashed items stay in Trash
- **WHEN** a user trashes a note, then trashes its folder, then restores the folder
- **THEN** the folder is restored and the note stays in Trash

#### Scenario: Parent no longer active
- **WHEN** a user restores a note whose original folder is still in Trash
- **THEN** the note reappears at the end of the root level

### Requirement: Delete forever
A user SHALL be able to permanently delete an item from the Trash view after confirming. This SHALL permanently delete the item and everything inside it, including items that were trashed separately. Permanent deletion SHALL NOT be offered for active or archived items.

#### Scenario: Confirm permanent deletion
- **WHEN** a user chooses "Delete forever" on a trashed folder and confirms
- **THEN** the folder and everything inside it are gone for good and no longer listed in Trash

#### Scenario: Cancel permanent deletion
- **WHEN** a user chooses "Delete forever" and then cancels the confirmation
- **THEN** nothing is deleted

### Requirement: Open archived and trashed items
Archived and trashed items SHALL NOT open in the main pane from their URLs; the Archive and Trash views are the way back to them.

#### Scenario: Old link to a trashed note
- **WHEN** a user opens a saved link to a note that is now in Trash
- **THEN** the main pane shows a "not found" message
