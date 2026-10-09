# Tasks

## 1. To top / To bottom

- [x] 1.1 Add `movedToEnd` to `src/lib/tree/reorder.ts` per D1. Verify that unit tests cover top, bottom, already first or last (null), and an unknown id.
- [x] 1.2 Add Move to top and Move to bottom to the Reorder submenu per D4, with the disabled rules. Verify in the browser:
  - Move to top on the last note of a four-note folder puts it first, and it stays there after a reload.
  - The first note shows Move to top and Move up unavailable.

## 2. "+" on project and folder rows

- [x] 2.1 Add `RowNewMenu` and place it on container rows per D2. Verify in the browser:
  - With a mouse, "+" appears on hover or focus only on project and folder rows.
  - "+" > Note creates a note inside, expands the folder and opens the note.
  - In touch emulation, "+" is always visible and at least 44px.
  - Note rows have no "+".

## 3. Convert on the item page

- [x] 3.1 Remove Convert from `item-menu.tsx` per D4. Verify that a folder's menu has six top-level entries and a note's has five.
- [x] 3.2 Add the kind row for folders and `KindSwitch` per D3. Verify in the browser:
  - On a project page, "Project" opens Project and Folder with the hint under Folder.
  - Picking Folder turns it into a folder: the icon and colour are cleared, it moves to the folders group in the sidebar, and Style disappears.
  - On a folder page, picking Project turns it back.
  - Keyboard: Enter opens, the arrows move, Enter picks.

## 4. Docs and release

- [x] 4.1 Update the README's item-tree notes (row "+", To top / To bottom, Convert on the item page). Verify that they match the code.
- [x] 4.2 Run types, lint, unit and integration tests. Verify that all pass.
- [x] 4.3 Push the branch. After the user approves, merge to `main` for a phone check.
