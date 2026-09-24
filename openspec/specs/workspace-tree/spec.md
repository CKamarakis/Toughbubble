# workspace-tree Specification

## Purpose
Lets a signed-in user build and navigate their workspace: a sidebar tree of projects, folders, notes, and Storms that they can create, open, rename, move, and search, with the selected item shown in the main pane and each project's or folder's contents reviewable and sortable there.

## Requirements
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
Selecting an item SHALL open it in the main pane at a URL that identifies the item, with a breadcrumb of its ancestors. Projects and folders SHALL show their contents; notes and Storms SHALL show their title and a placeholder until their editors exist. When an item becomes the open item, the sidebar SHALL reveal it by expanding its ancestors once; the user SHALL remain free to collapse them afterwards.

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

### Requirement: Expand and collapse
A user SHALL be able to expand and collapse projects and folders in the sidebar with their arrow, including those that contain the open item, and the expanded state SHALL be remembered in that browser. Clicking a project's or folder's name SHALL open it and expand it; clicking the name of the project or folder that is already open SHALL collapse or expand it. Opening it in a new tab (Ctrl/Cmd-click or middle-click) SHALL NOT change the sidebar. Reloading the page on the same item SHALL NOT expand again what the user collapsed.

#### Scenario: Expanded state survives reload
- **WHEN** a user collapses a project and reloads the page
- **THEN** the project is still collapsed

#### Scenario: Collapse the path to the open item
- **WHEN** a note inside a folder inside a project is open, and the user collapses the project
- **THEN** the project collapses and the note stays open in the main pane

#### Scenario: Collapsed path survives reload
- **WHEN** the user collapses the project containing the open note and reloads the page
- **THEN** the note is still open and the project is still collapsed

#### Scenario: Click a name to open and expand
- **WHEN** a user clicks the name of a collapsed folder
- **THEN** the folder's page opens and the folder expands in the sidebar

#### Scenario: Click the open folder's name to collapse
- **WHEN** a folder's page is open and the user clicks that folder's name in the sidebar
- **THEN** the folder collapses and its page stays open; clicking the name again expands it

#### Scenario: Open in a new tab
- **WHEN** a user Ctrl-clicks a collapsed folder's name
- **THEN** the folder opens in a new tab and the sidebar in the current tab is unchanged

#### Scenario: Opening another item reveals it
- **WHEN** the user has collapsed a project and then opens a note inside it from a link or from a project page
- **THEN** the project and the note's folder expand in the sidebar so the note is visible

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
