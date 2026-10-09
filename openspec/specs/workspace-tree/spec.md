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
A user SHALL be able to create a project, folder, note, or Storm at the root level or inside a project or folder. A new item SHALL appear at the top of its kind's group, get a default title for its kind, be selected, and have its title ready to edit. The New buttons SHALL stay available while another change (such as a rename, move, or archive) is saving. Every New menu SHALL list the kinds in the same order: Note, Storm, Folder, Project.

#### Scenario: Create at the root
- **WHEN** a user chooses New > Project from the sidebar
- **THEN** a project titled "Untitled project" appears first among the root-level projects, opens in the main pane, and its title is ready to edit

#### Scenario: Create inside a container
- **WHEN** a user chooses New inside > Note from a folder's menu
- **THEN** a note appears first among the notes and Storms inside that folder, the folder expands, and the note opens

#### Scenario: Same order in every New menu
- **WHEN** a user opens the sidebar New menu and a folder's New inside submenu
- **THEN** both list Note, Storm, Folder, Project in that order

#### Scenario: Notes and Storms cannot contain items
- **WHEN** a user opens the menu of a note or a Storm
- **THEN** it offers no option to create an item inside it

#### Scenario: New during a save
- **WHEN** a user archives a note and, while that is saving, opens the sidebar's New menu
- **THEN** the New menu opens and works

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

### Requirement: Small-screen sidebar
Below the medium breakpoint (768px) the sidebar SHALL be hidden behind an open button in a top bar, and SHALL open as a modal panel over the page. While open: focus SHALL move into the panel and stay within it, the page behind SHALL NOT be reachable by keyboard or screen reader, and the panel SHALL be announced as a dialog named "Sidebar". The panel SHALL close with Escape, with a visible close button, by tapping outside it, and when the user opens an item. On close, focus SHALL return to the open button. The top bar SHALL show, next to the open button, the title of the open item, or the page's name (Home, Archive, Trash, Settings) when no item is open. On touch screens the open button and the panel's header buttons (New and close) SHALL be at least 44px square, with at least 8px between neighbouring buttons.

#### Scenario: Thumb-sized header buttons
- **WHEN** a user opens the sidebar on a phone
- **THEN** the open button, New and close are each at least 44px square and New and close are at least 8px apart

#### Scenario: Close with Escape
- **WHEN** a user on a 390px-wide screen opens the sidebar and presses Escape
- **THEN** the panel closes and focus is on the open button

#### Scenario: Close button
- **WHEN** a user opens the sidebar on a small screen
- **THEN** the panel shows a close button, and choosing it closes the panel

#### Scenario: Focus stays in the panel
- **WHEN** the panel is open and the user presses Tab repeatedly
- **THEN** focus moves only between controls inside the panel

#### Scenario: Opening an item closes the panel
- **WHEN** a user opens a note from the panel
- **THEN** the panel closes and the note is shown

#### Scenario: Where am I
- **WHEN** a user on a small screen has the note "Budget" open
- **THEN** the top bar shows "Budget" next to the open button

#### Scenario: Wide screens unchanged
- **WHEN** the window is 768px wide or more
- **THEN** the sidebar is shown beside the page, with no top bar and no panel behavior

### Requirement: Touch-friendly rows
On touch screens (no hover), every sidebar row SHALL show its actions button at all times and SHALL be at least 40px tall. A long press on a row SHALL open that row's actions menu and SHALL NOT open the item. Touch input SHALL NOT drag rows: on touch screens items are reordered with the menu's Reorder submenu or moved with Move to…, so swiping always scrolls the sidebar. Mouse and pen input SHALL keep drag to reorder. Devices with hover SHALL keep the current compact rows with actions shown on hover or focus.

#### Scenario: Actions visible on a phone
- **WHEN** a user views the sidebar on a touch screen
- **THEN** each row shows its "⋯" actions button without hovering

#### Scenario: Long press opens the menu
- **WHEN** a user presses and holds a note's row on a touch screen without moving
- **THEN** the note's actions menu opens and the note does not open

#### Scenario: Swipe scrolls
- **WHEN** a user swipes up on the sidebar list on a touch screen
- **THEN** the list scrolls and no item is moved

#### Scenario: Desktop unchanged
- **WHEN** a user with a mouse views the sidebar
- **THEN** rows keep their compact height and the actions button appears on hover or keyboard focus

### Requirement: Current item marker
The sidebar row of the open item SHALL look different from a hovered row: it SHALL carry an accent mark at its left edge in addition to its highlight and medium weight. A hovered row SHALL show only the highlight.

#### Scenario: Current and hovered side by side
- **WHEN** a note is open and the user hovers another note's row
- **THEN** only the open note's row shows the accent mark

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

### Requirement: Consistent dates
Every date shown in the workspace (contents view, Archive view, Trash view) SHALL use the same format, the medium date style of the browser's locale and time zone, including on the first page load.

#### Scenario: Same format everywhere
- **WHEN** a user with an English (UK) browser opens a folder's contents and then the Trash view
- **THEN** both show dates like "8 Oct 2026"

### Requirement: Small-screen panel width
The small-screen sidebar panel SHALL be about 85% of the screen width, and at most 360px wide, leaving a strip of the page visible to tap for closing it.

#### Scenario: Panel on a phone
- **WHEN** a user opens the sidebar on a screen 412px wide
- **THEN** the panel is about 350px wide and a strip of the page stays visible beside it

#### Scenario: Panel on a wider small screen
- **WHEN** a user opens the sidebar on a screen 700px wide
- **THEN** the panel is 360px wide

### Requirement: Account menu
The bottom of the sidebar SHALL show Archive and Trash as links, followed by one account row with the user's avatar initial and email. Choosing the account row SHALL open a menu with Settings, a theme choice of Light, Dark and System showing the current choice, and Sign out. Choosing a theme in the menu SHALL apply it at once, as the theme control does. The sidebar SHALL NOT show separate Settings, theme or Sign out controls. While the Settings page is open, the account row SHALL show the same highlight as the link of the current page. The menu SHALL be usable with the keyboard and SHALL close with Escape, returning focus to the account row.

#### Scenario: Open the account menu
- **WHEN** a user chooses their email at the bottom of the sidebar
- **THEN** a menu opens with Settings, Light, Dark, System and Sign out, and the current theme is marked as chosen

#### Scenario: Change theme from the menu
- **WHEN** a user using the light theme chooses Dark in the account menu
- **THEN** the app switches to the dark theme immediately and the choice is remembered as before

#### Scenario: Sign out from the menu
- **WHEN** a user chooses Sign out in the account menu
- **THEN** they are signed out and taken to the sign-in page

#### Scenario: Compact sidebar footer
- **WHEN** a user views the sidebar
- **THEN** below the tree there are only the Archive and Trash links and the account row

#### Scenario: Settings page highlight
- **WHEN** the Settings page is open
- **THEN** the account row is highlighted like the current page's link

#### Scenario: Keyboard
- **WHEN** a keyboard user focuses the account row, presses Enter, moves to Dark with the arrow keys, and presses Enter
- **THEN** the dark theme is applied. Opening the menu again and pressing Escape closes it and puts focus back on the account row

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
