# Spec Delta

## ADDED Requirements

### Requirement: Create from a row
Sidebar rows of projects and folders SHALL show a "+" button next to the actions button. Choosing it SHALL open a menu listing Note, Storm, Folder and Project in that order. Choosing one SHALL create that item inside the row's project or folder, as "New inside" does. With a mouse, the "+" button SHALL appear on hover or keyboard focus, like the actions button. On touch screens it SHALL always be visible. Rows of notes and Storms SHALL NOT show it.

#### Scenario: Create a note from a folder row
- **WHEN** a user chooses "+" on the folder "Kitchen" in the sidebar and then Note
- **THEN** a note appears first among the notes and Storms inside "Kitchen", the folder expands, and the note opens

#### Scenario: Only on containers
- **WHEN** a user views the sidebar
- **THEN** project and folder rows offer "+", and note and Storm rows do not

#### Scenario: Visible on a phone
- **WHEN** a user views the sidebar on a touch screen
- **THEN** each project and folder row shows "+" without hovering

## MODIFIED Requirements

### Requirement: Reorder items
A user SHALL be able to change an item's place among its siblings by dragging it in the sidebar with a mouse or pen, within the same project or folder (or the root level) and within its kind's group. While dragging, a line SHALL show where the item will land, and only places within the same group SHALL be offered. The item menu's Reorder submenu SHALL offer "Move to top", "Move up", "Move down" and "Move to bottom" for the same change without dragging. "Move to top" and "Move up" SHALL be unavailable for the first item of the group, and "Move down" and "Move to bottom" for the last. The new order SHALL be saved to the account.

#### Scenario: Drag a note to the top of its folder
- **WHEN** a folder contains notes A, B, C in that order and the user drags C above A
- **THEN** the folder lists C, A, B, and still does after a reload

#### Scenario: Only within the group
- **WHEN** a user drags a note over the folders at the same level, or over items in another folder
- **THEN** no landing line is shown there and releasing leaves the order unchanged

#### Scenario: Keyboard reorder
- **WHEN** a user opens the menu of note B in the order A, B, C and chooses Reorder > Move up
- **THEN** the order becomes B, A, C

#### Scenario: Move to top
- **WHEN** a user opens the menu of note D in the order A, B, C, D and chooses Reorder > Move to top
- **THEN** the order becomes D, A, B, C, and still is after a reload

#### Scenario: Move to bottom
- **WHEN** a user opens the menu of note A in the order A, B, C, D and chooses Reorder > Move to bottom
- **THEN** the order becomes B, C, D, A

#### Scenario: Ends of the group
- **WHEN** a user opens the Reorder submenu of the first note in a folder
- **THEN** "Move to top" and "Move up" are unavailable, and "Move down" and "Move to bottom" are available

#### Scenario: New item after reordering
- **WHEN** a user has arranged a folder's notes as C, A, B and creates a new note in it
- **THEN** the new note appears first, followed by C, A, B

### Requirement: Item menu layout
An item's actions menu SHALL show at its top level: "New inside" (for projects and folders), Rename, Move to…, "Reorder", Archive, and Move to Trash. "New inside" SHALL open a submenu with Note, Storm, Folder, and Project. "Reorder" SHALL open a submenu with Move to top, Move up, Move down and Move to bottom. The menu SHALL NOT offer Convert. The menu and its submenus SHALL be usable with the keyboard.

#### Scenario: Container menu
- **WHEN** a user opens a folder's actions menu
- **THEN** it shows six top-level entries with no Convert, and "New inside" opens a submenu listing Note, Storm, Folder, and Project

#### Scenario: Note menu
- **WHEN** a user opens a note's actions menu
- **THEN** it shows Rename, Move to…, Reorder, Archive, and Move to Trash, and no "New inside"

#### Scenario: Submenu by keyboard
- **WHEN** a user focuses "Reorder" in an open menu and presses the right arrow key
- **THEN** the submenu opens with focus on its first available entry

### Requirement: Convert between folder and project
A user SHALL be able to convert a folder into a project and a project into a folder, keeping its title, parent, creation time, and contents. The page of a project or folder SHALL show its kind ("Project" or "Folder") as a control that opens a choice of Project and Folder, with the current kind marked. The Folder choice SHALL carry a short hint that folders have no icon or colour.

#### Scenario: Folder becomes a project
- **WHEN** a user opens the folder's page, chooses its "Folder" label, and picks Project, for a folder containing two notes
- **THEN** it becomes a project in the same parent, listed with the projects, with the same title and two notes, and gains project icon and color options

#### Scenario: Project becomes a folder
- **WHEN** a user chooses the "Project" label on a project's page and picks Folder
- **THEN** it becomes a folder in the same parent, listed with the folders, with the same title and contents, and its project icon and color are cleared

#### Scenario: The hint explains what changes
- **WHEN** a user opens the kind choice on a project's page
- **THEN** the Folder choice says that folders have no icon or colour
