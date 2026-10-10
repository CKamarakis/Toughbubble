## MODIFIED Requirements

### Requirement: Open items
Selecting an item SHALL open it in the main pane at a URL that identifies the item, with a breadcrumb of its ancestors. Projects and folders SHALL show their contents; notes SHALL show their title and editor; Storms SHALL show their title and board. When an item becomes the open item, the sidebar SHALL reveal it by expanding its ancestors once; the user SHALL remain free to collapse them afterwards.

#### Scenario: Open a note
- **WHEN** a user selects a note inside a folder inside a project
- **THEN** the main pane shows the breadcrumb "project / folder / note", the note's title, and its editor, and the browser URL identifies the note

#### Scenario: Open a storm
- **WHEN** a user selects a Storm
- **THEN** the main pane shows the breadcrumb, the Storm's title, and its board, and the browser URL identifies the Storm

#### Scenario: Open by URL
- **WHEN** a user opens the URL of one of their active items directly
- **THEN** the item opens and the sidebar reveals it by expanding its ancestors

#### Scenario: Item not available
- **WHEN** a user opens the URL of an item that does not exist, belongs to someone else, or is archived or trashed
- **THEN** the main pane shows a "not found" message instead of the item

### Requirement: Item menu layout
An item's actions menu SHALL show at its top level: "New inside" (for projects and folders), Rename, Duplicate (for Storms), Move to…, "Reorder", Archive, and Move to Trash. "New inside" SHALL open a submenu with Note, Storm, Folder, and Project. "Reorder" SHALL open a submenu with Move to top, Move up, Move down and Move to bottom. The menu SHALL NOT offer Convert. The menu and its submenus SHALL be usable with the keyboard.

#### Scenario: Container menu
- **WHEN** a user opens a folder's actions menu
- **THEN** it shows six top-level entries with no Convert and no Duplicate, and "New inside" opens a submenu listing Note, Storm, Folder, and Project

#### Scenario: Note menu
- **WHEN** a user opens a note's actions menu
- **THEN** it shows Rename, Move to…, Reorder, Archive, and Move to Trash, and no "New inside" or Duplicate

#### Scenario: Storm menu
- **WHEN** a user opens a Storm's actions menu
- **THEN** it shows Rename, Duplicate, Move to…, Reorder, Archive, and Move to Trash

#### Scenario: Submenu by keyboard
- **WHEN** a user focuses "Reorder" in an open menu and presses the right arrow key
- **THEN** the submenu opens with focus on its first available entry

## ADDED Requirements

### Requirement: Duplicate a storm
Duplicate SHALL create a new Storm titled "<title> (copy)", shortened if needed to fit the title limit, in the same parent, listed directly below the original, with a copy of all the original's board items. The copy SHALL then open. A Storm that has never been saved SHALL be copied as an empty Storm. Changes to the copy SHALL NOT affect the original.

#### Scenario: Duplicate
- **WHEN** a user duplicates a Storm "Plan" with three stickies
- **THEN** "Plan (copy)" appears directly below "Plan" in the sidebar with the same three stickies, and it opens

#### Scenario: Below the original in an unarranged group
- **WHEN** a user duplicates a Storm in a folder whose items were never rearranged
- **THEN** the copy is listed directly below the original, not at the top

#### Scenario: Independent copy
- **WHEN** a user moves a sticky in the copy
- **THEN** the original's sticky stays where it was

#### Scenario: Long title
- **WHEN** a user duplicates a Storm whose title is at the title limit
- **THEN** the copy's title is shortened so that it still ends in " (copy)" and fits the limit
