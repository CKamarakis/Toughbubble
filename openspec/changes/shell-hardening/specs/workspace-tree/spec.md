# Spec Delta

## ADDED Requirements

### Requirement: Small-screen sidebar
Below the medium breakpoint (768px) the sidebar SHALL be hidden behind an open button in a top bar, and SHALL open as a modal panel over the page. While open: focus SHALL move into the panel and stay within it, the page behind SHALL NOT be reachable by keyboard or screen reader, and the panel SHALL be announced as a dialog named "Sidebar". The panel SHALL close with Escape, with a visible close button, by tapping outside it, and when the user opens an item. On close, focus SHALL return to the open button. The top bar SHALL show, next to the open button, the title of the open item, or the page's name (Home, Archive, Trash, Settings) when no item is open.

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
An item's actions menu SHALL show at its top level: "New inside" (for projects and folders), Rename, Move to…, "Reorder", Convert (for projects and folders), Archive, and Move to Trash. "New inside" SHALL open a submenu with Note, Storm, Folder, and Project. "Reorder" SHALL open a submenu with Move up and Move down. The menu and its submenus SHALL be usable with the keyboard.

#### Scenario: Container menu
- **WHEN** a user opens a folder's actions menu
- **THEN** it shows seven top-level entries, and "New inside" opens a submenu listing Note, Storm, Folder, and Project

#### Scenario: Note menu
- **WHEN** a user opens a note's actions menu
- **THEN** it shows Rename, Move to…, Reorder, Archive, and Move to Trash, and no "New inside" or Convert

#### Scenario: Submenu by keyboard
- **WHEN** a user focuses "Reorder" in an open menu and presses the right arrow key
- **THEN** the submenu opens with focus on its first available entry

### Requirement: Consistent dates
Every date shown in the workspace (contents view, Archive view, Trash view) SHALL use the same format, the medium date style of the browser's locale and time zone, including on the first page load.

#### Scenario: Same format everywhere
- **WHEN** a user with an English (UK) browser opens a folder's contents and then the Trash view
- **THEN** both show dates like "8 Oct 2026"

## MODIFIED Requirements

### Requirement: Create items
A user SHALL be able to create a project, folder, note, or Storm at the root level or inside a project or folder. A new item SHALL appear at the top of its kind's group, get a default title for its kind, be selected, and have its title ready to edit. The New buttons SHALL stay available while another change (such as a rename, move, or archive) is saving.

#### Scenario: Create at the root
- **WHEN** a user chooses New > Project from the sidebar
- **THEN** a project titled "Untitled project" appears first among the root-level projects, opens in the main pane, and its title is ready to edit

#### Scenario: Create inside a container
- **WHEN** a user chooses New inside > Note from a folder's menu
- **THEN** a note appears first among the notes and Storms inside that folder, the folder expands, and the note opens

#### Scenario: Notes and Storms cannot contain items
- **WHEN** a user opens the menu of a note or a Storm
- **THEN** it offers no option to create an item inside it

#### Scenario: New during a save
- **WHEN** a user archives a note and, while that is saving, opens the sidebar's New menu
- **THEN** the New menu opens and works

### Requirement: Reorder items
A user SHALL be able to change an item's place among its siblings by dragging it in the sidebar with a mouse or pen, within the same project or folder (or the root level) and within its kind's group. While dragging, a line SHALL show where the item will land, and only places within the same group SHALL be offered. The item menu's Reorder submenu SHALL offer "Move up" and "Move down" for the same change from the keyboard, unavailable at the start and end of the group. The new order SHALL be saved to the account.

#### Scenario: Drag a note to the top of its folder
- **WHEN** a folder contains notes A, B, C in that order and the user drags C above A
- **THEN** the folder lists C, A, B, and still does after a reload

#### Scenario: Only within the group
- **WHEN** a user drags a note over the folders at the same level, or over items in another folder
- **THEN** no landing line is shown there and releasing leaves the order unchanged

#### Scenario: Keyboard reorder
- **WHEN** a user opens the menu of note B in the order A, B, C and chooses Reorder > Move up
- **THEN** the order becomes B, A, C

#### Scenario: Ends of the group
- **WHEN** a user opens the Reorder submenu of the first note in a folder
- **THEN** "Move up" is unavailable and "Move down" is available

#### Scenario: New item after reordering
- **WHEN** a user has arranged a folder's notes as C, A, B and creates a new note in it
- **THEN** the new note appears first, followed by C, A, B
