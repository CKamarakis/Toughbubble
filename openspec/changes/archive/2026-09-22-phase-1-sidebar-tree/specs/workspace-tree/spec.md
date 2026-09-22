# Spec Delta

## Purpose

Lets a signed-in user build and navigate their workspace: a sidebar tree of projects, folders, notes, and Storms that they can create, open, rename, move, and search, with the selected item shown in the main pane and each project's or folder's contents reviewable and sortable there.

## ADDED Requirements

### Requirement: Sidebar tree
The workspace SHALL show a sidebar listing the user's active items as a tree, with the account area (email, theme control, sign out) in the sidebar. At every level the tree SHALL group items as projects first, then folders, then notes and Storms together, and order each group by creation time, newest first. The sidebar order SHALL NOT be changeable. Archived and trashed items SHALL NOT appear in the tree.

#### Scenario: Tree reflects the workspace
- **WHEN** a user has a project containing a folder that contains a note
- **THEN** the sidebar shows the project at the root level, the folder under it, and the note under the folder, each with an icon for its kind

#### Scenario: Grouping and order
- **WHEN** a folder contains a note created on Monday, a folder created on Tuesday, a Storm created on Wednesday, and a project created on Thursday
- **THEN** the sidebar lists inside it the project, then the folder, then the Storm, then the note

#### Scenario: Empty workspace
- **WHEN** a user with no active items opens the workspace
- **THEN** the sidebar shows an empty state with a way to create their first item

### Requirement: Create items
A user SHALL be able to create a project, folder, note, or Storm at the root level or inside a project or folder. A new item SHALL appear at the top of its kind's group, get a default title for its kind, be selected, and have its title ready to edit.

#### Scenario: Create at the root
- **WHEN** a user chooses New > Project from the sidebar
- **THEN** a project titled "Untitled project" appears first among the root-level projects, opens in the main pane, and its title is ready to edit

#### Scenario: Create inside a container
- **WHEN** a user chooses "New note" from a folder's menu
- **THEN** a note appears first among the notes and Storms inside that folder, the folder expands, and the note opens

#### Scenario: Notes and Storms cannot contain items
- **WHEN** a user opens the menu of a note or a Storm
- **THEN** it offers no option to create an item inside it

### Requirement: Open items
Selecting an item SHALL open it in the main pane at a URL that identifies the item, with a breadcrumb of its ancestors. Projects and folders SHALL show their contents; notes and Storms SHALL show their title and a placeholder until their editors exist.

#### Scenario: Open a note
- **WHEN** a user selects a note inside a folder inside a project
- **THEN** the main pane shows the breadcrumb "project / folder / note", the note's title, and a placeholder for its content, and the browser URL identifies the note

#### Scenario: Open by URL
- **WHEN** a user opens the URL of one of their active items directly
- **THEN** the item opens and the sidebar reveals it by expanding its ancestors

#### Scenario: Item not available
- **WHEN** a user opens the URL of an item that does not exist, belongs to someone else, or is archived or trashed
- **THEN** the main pane shows a "not found" message instead of the item

### Requirement: Contents view and sorting
The page of a project or folder SHALL list its active contents with each item's kind icon, title, created date, and last edited date, grouped like the sidebar (projects, folders, then notes and Storms). The user SHALL be able to sort each group by Newest, Oldest, Last edited, A–Z, or Z–A; the choice SHALL apply to every project and folder page, be remembered in that browser, and SHALL NOT change the sidebar. Projects and folders in the list SHALL expand in place to show their own contents. An item's last edited time SHALL be the last time it was renamed, restyled, converted, or moved (and, once editors exist, when its content was saved).

#### Scenario: Default sort
- **WHEN** a user opens a folder's page for the first time
- **THEN** its contents are grouped like the sidebar and each group is sorted Newest first

#### Scenario: Sort alphabetically
- **WHEN** a user chooses A–Z on a project's page
- **THEN** each group on that page is sorted by title, case-insensitively, and the sidebar order does not change

#### Scenario: Sort by last edited
- **WHEN** a user renames an older note and then chooses Last edited on its folder's page
- **THEN** that note is listed first among the notes and Storms

#### Scenario: Sort choice remembered
- **WHEN** a user chooses Oldest on one folder's page, then opens another project's page and later reloads
- **THEN** both pages use Oldest

#### Scenario: Review a subfolder in place
- **WHEN** a user expands a subfolder in a project's contents list
- **THEN** the subfolder's contents appear beneath it in the list, sorted the same way, without leaving the page

#### Scenario: Empty container
- **WHEN** a user opens a project or folder with no active contents
- **THEN** the page says it is empty and offers to create an item inside it

### Requirement: Rename items
A user SHALL be able to rename any active item from the sidebar or the main pane. An empty title SHALL be shown as the kind's default title.

#### Scenario: Rename from the main pane
- **WHEN** a user edits an item's title in the main pane and presses Enter or leaves the field
- **THEN** the new title is saved and shown in the sidebar and breadcrumb

#### Scenario: Cancel a rename
- **WHEN** a user presses Escape while editing a title
- **THEN** the edit is discarded and the previous title remains

### Requirement: Project icon and color
A user SHALL be able to give a project an icon and a color from a preset list, shown in the sidebar and main pane.

#### Scenario: Change a project's color
- **WHEN** a user picks a color for a project
- **THEN** the project's icon in the sidebar and main pane shows that color

### Requirement: Convert between folder and project
A user SHALL be able to convert a folder into a project and a project into a folder, keeping its title, parent, creation time, and contents.

#### Scenario: Folder becomes a project
- **WHEN** a user converts a folder containing two notes into a project
- **THEN** it becomes a project in the same parent, listed with the projects, with the same title and two notes, and gains project icon and color options

#### Scenario: Project becomes a folder
- **WHEN** a user converts a project into a folder
- **THEN** it becomes a folder in the same parent, listed with the folders, with the same title and contents, and its project icon and color are cleared

### Requirement: Move items
A user SHALL be able to move an item into a project or folder, or to the root level, by dragging it in the sidebar or through a "Move to…" dialog operable with the keyboard alone. A moved item SHALL take its place in the destination according to the sidebar order, and the move SHALL persist.

#### Scenario: Move into a folder by dragging
- **WHEN** a user drags a note onto a folder in another project
- **THEN** the note appears inside that folder in its place by the sidebar order, and stays there after a reload

#### Scenario: Move to the root by dragging
- **WHEN** a user drags a folder out of a project to the root level
- **THEN** the folder appears at the root level among the folders

#### Scenario: Move with the dialog
- **WHEN** a user chooses "Move to…" on an item and picks a destination project, folder, or the root level
- **THEN** the item moves into that destination

#### Scenario: Invalid destinations
- **WHEN** a user moves a folder, by dragging or with the dialog
- **THEN** the folder itself, its descendants, and notes and Storms are not offered or accepted as destinations

#### Scenario: No manual reordering
- **WHEN** a user drags an item within its own container
- **THEN** its place does not change, because the sidebar order is fixed

### Requirement: Expand and collapse
A user SHALL be able to expand and collapse projects and folders in the sidebar, and the expanded state SHALL be remembered in that browser.

#### Scenario: Expanded state survives reload
- **WHEN** a user collapses a project and reloads the page
- **THEN** the project is still collapsed

### Requirement: Title search
The sidebar SHALL provide a search box that filters the tree by title as the user types, case-insensitively, over active items.

#### Scenario: Matching items shown in context
- **WHEN** a user types "plan" and a note titled "Q3 Planning" is inside a folder
- **THEN** the sidebar shows that note with its ancestors so its location is visible, and hides items that neither match nor contain a match

#### Scenario: No matches
- **WHEN** a user types text that matches no active item title
- **THEN** the sidebar shows "No matching items"

#### Scenario: Clear the search
- **WHEN** a user clears the search box
- **THEN** the full tree returns with its previous expanded state
