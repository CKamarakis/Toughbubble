# Spec Delta

## MODIFIED Requirements

### Requirement: Item menu layout
An item's actions menu SHALL show at its top level: "New inside" (for projects and folders), Rename, Duplicate (for notes and Storms), "Export as Markdown" (for notes), Move to…, "Reorder", Archive, and Move to Trash. "New inside" SHALL open a submenu with Note, Storm, Folder, and Project. "Reorder" SHALL open a submenu with Move to top, Move up, Move down and Move to bottom. The menu SHALL NOT offer Convert. The menu and its submenus SHALL be usable with the keyboard.

#### Scenario: Container menu
- **WHEN** a user opens a folder's actions menu
- **THEN** it shows six top-level entries with no Convert, no Duplicate and no "Export as Markdown", and "New inside" opens a submenu listing Note, Storm, Folder, and Project

#### Scenario: Note menu
- **WHEN** a user opens a note's actions menu
- **THEN** it shows Rename, Duplicate, Export as Markdown, Move to…, Reorder, Archive, and Move to Trash, and no "New inside"

#### Scenario: Storm menu
- **WHEN** a user opens a Storm's actions menu
- **THEN** it shows Rename, Duplicate, Move to…, Reorder, Archive, and Move to Trash, and no "Export as Markdown"

#### Scenario: Submenu by keyboard
- **WHEN** a user focuses "Reorder" in an open menu and presses the right arrow key
- **THEN** the submenu opens with focus on its first available entry
