# Spec Delta

## ADDED Requirements

### Requirement: Undo archive and trash
After a user archives or trashes an active item from the sidebar or an item page, the confirmation SHALL offer Undo for as long as it is shown (at least 5 seconds). Undo SHALL restore the item and everything archived or trashed together with it to their places, as Restore does. The confirmation SHALL appear only once the archive or trash has been saved, so Undo never races the save. Undo SHALL act at most once per confirmation. If the user was viewing the item, or an item inside it, when they archived or trashed it, Undo SHALL also take them back to that page.

#### Scenario: Undo an archive
- **WHEN** a user archives a project containing a folder with two notes and chooses Undo in the confirmation
- **THEN** the project, folder, and notes reappear in the tree in their original place and order, and the project is not in the Archive view

#### Scenario: Undo a trash
- **WHEN** a user moves a note to Trash from its menu and chooses Undo
- **THEN** the note reappears in the tree where it was, and the Trash view does not list it

#### Scenario: Back to the page they were on
- **WHEN** a user viewing a note archives it from the page's menu, is taken to the workspace home, and chooses Undo
- **THEN** the note is restored and opens again

#### Scenario: Undo only once
- **WHEN** a user chooses Undo twice in quick succession
- **THEN** the item is restored once and no error is shown

#### Scenario: Confirmation dismissed
- **WHEN** the confirmation closes without the user choosing Undo
- **THEN** the item stays archived or trashed and can still be restored from the Archive or Trash view
