# Spec Delta

## MODIFIED Requirements

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
