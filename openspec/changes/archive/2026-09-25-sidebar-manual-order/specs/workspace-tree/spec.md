# Spec Delta

## MODIFIED Requirements

### Requirement: Sidebar tree
The workspace SHALL show a sidebar listing the user's active items as a tree, with the account area (email, theme control, sign out) in the sidebar. At every level the tree SHALL group items as projects first, then folders, then notes and Storms together. Within each group, items SHALL appear in the order the user arranged them; items the user has not arranged SHALL be ordered by creation time, newest first. Archived and trashed items SHALL NOT appear in the tree.

#### Scenario: Tree reflects the workspace
- **WHEN** a user has a project containing a folder that contains a note
- **THEN** the sidebar shows the project at the root level, the folder under it, and the note under the folder, each with an icon for its kind

#### Scenario: Grouping and order
- **WHEN** a folder contains a note created on Monday, a folder created on Tuesday, a Storm created on Wednesday, and a project created on Thursday, and the user has not rearranged them
- **THEN** the sidebar lists inside it the project, then the folder, then the Storm, then the note

#### Scenario: Arranged order kept
- **WHEN** a user has dragged the oldest note in a folder to the top of that folder's notes and reloads the page on another device
- **THEN** that note is listed first among the folder's notes and Storms

#### Scenario: Empty workspace
- **WHEN** a user with no active items opens the workspace
- **THEN** the sidebar shows an empty state with a way to create their first item

## ADDED Requirements

### Requirement: Move items with Move to
A user SHALL be able to move an item into a project or folder, or to the root level, through a "Move to…" dialog in the item's menu, operable with the keyboard alone. A moved item SHALL appear at the top of its kind's group in the destination, and the move SHALL persist. Dragging in the sidebar SHALL NOT move an item into another container or to another level.

#### Scenario: Move with the dialog
- **WHEN** a user chooses "Move to…" on an item and picks a destination project, folder, or the root level
- **THEN** the item moves into that destination, first among the items of its kind's group there, and stays there after a reload

#### Scenario: Invalid destinations
- **WHEN** a user moves a folder with the dialog
- **THEN** the folder itself, its descendants, and notes and Storms are not offered or accepted as destinations

#### Scenario: Dragging onto a folder doesn't move
- **WHEN** a user drags a note from one folder and releases it over a different folder
- **THEN** the note stays where it was


### Requirement: Reorder items
A user SHALL be able to change an item's place among its siblings by dragging it in the sidebar, within the same project or folder (or the root level) and within its kind's group. While dragging, a line SHALL show where the item will land, and only places within the same group SHALL be offered. The item menu SHALL offer "Move up" and "Move down" for the same change from the keyboard, unavailable at the start and end of the group. The new order SHALL be saved to the account.

#### Scenario: Drag a note to the top of its folder
- **WHEN** a folder contains notes A, B, C in that order and the user drags C above A
- **THEN** the folder lists C, A, B, and still does after a reload

#### Scenario: Only within the group
- **WHEN** a user drags a note over the folders at the same level, or over items in another folder
- **THEN** no landing line is shown there and releasing leaves the order unchanged

#### Scenario: Keyboard reorder
- **WHEN** a user opens the menu of note B in the order A, B, C and chooses "Move up"
- **THEN** the order becomes B, A, C

#### Scenario: Ends of the group
- **WHEN** a user opens the menu of the first note in a folder
- **THEN** "Move up" is unavailable and "Move down" is available

#### Scenario: New item after reordering
- **WHEN** a user has arranged a folder's notes as C, A, B and creates a new note in it
- **THEN** the new note appears first, followed by C, A, B

## REMOVED Requirements

### Requirement: Move items
**Reason**: Dragging in the sidebar now only reorders items within their group, so moving by dragging into a folder, a project, or the top level is gone; the dialog part lives on as "Move items with Move to".
**Migration**: Use "Move to…" in the item's menu to move an item into another project or folder or to the top level.
