# Proposal

## Why

The 2026-10-08 phone check of the "⋯" item menu found three problems:
- "Convert to folder" was unclear. It switches the item's kind and drops a project's icon and colour, but nothing says so, and it reads like it might create a new folder.
- Creating inside a project or folder takes two taps into a submenu.
- Moving an item to the start or end of a long group takes many "Move up" steps.

## What Changes

- **"+" on project and folder rows**: sidebar rows of projects and folders get a "+" button next to "⋯". It opens Note, Storm, Folder and Project, which create the item inside that row. Like "⋯", it shows on hover or focus with a mouse and always on touch screens.
- **To top / To bottom**: the Reorder submenu gets "Move to top" and "Move to bottom" next to Move up and Move down. They are unavailable at the matching end of the group.
- **Convert moves to the item page**: the "⋯" menu no longer offers Convert. On a project's or folder's page, its kind label ("Project" or "Folder") becomes a small menu to switch between the two. The Folder option carries a one-line hint that folders have no icon or colour. Folder pages get the kind row too; today only projects show it, for their Style button.
- The "New inside" submenu stays in "⋯" for keyboard users and the item page.

**Decided:** Convert goes on the item page's kind label (option a), confirmed by the user on 2026-10-09.

Out of scope: "Wrap in folder" (put a note into a new folder of the same name), noted as a later idea.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-tree`:
  - adds "+" on project and folder rows;
  - changes Reorder items (To top and To bottom);
  - changes Item menu layout (no Convert);
  - changes Convert between folder and project (done from the item page's kind label, with a hint).

## Impact

- `src/lib/tree/reorder.ts`: a pure helper for moving to an end of the group, with unit tests.
- `item-menu.tsx`: Reorder entries, and Convert removed.
- `sidebar-tree.tsx` plus a small row "+" menu component.
- `item-view.tsx`: kind row for folders, and a kind switch menu.
- Uses the existing `reorder` and `convert` actions. No server, data or migration changes.
