# Tasks

## 1. Order and data

- [x] 1.1 Add `position` to `TreeRow` and the tree queries, and change `sidebarCompare` per D1; verify unit tests: untouched groups keep newest first, positions order within a group, groups stay in kind order
- [x] 1.2 Add the `reorderGroup` operation and Server Action per D2 (exact id set check, whole-group keys, no `edited_at` change); verify integration tests: reorder persists, a mismatched id set is refused and changes nothing, another user's items are refused, items from another group or parent are refused
- [x] 1.3 Put new and moved items at the top of their group per D3 in `createItem` and `moveItem`; verify integration tests: after a reorder a new item and a moved-in item come first; in an untouched group a new item still comes first

## 2. Sidebar

- [x] 2.1 Add the optimistic `reorder` change and `ws.reorder` in `workspace-context.tsx`; verify types and lint pass
- [x] 2.2 Rework `tree-dnd.tsx` per D4 (same-parent, same-group targets only; above/below line; drop reorders; remove drop-into-container, the top-level strip, and hover auto-expand); verify types and lint pass
- [x] 2.3 Add "Move up" / "Move down" to the item menu per D5; verify types and lint pass

## 3. Verification and release

- [x] 3.1 Browser check on a production build: drag a note to the top of its folder (line shown, order saved after reload); no line and no change over folders or another folder's items; dropping on a folder doesn't move the note; Move up / Move down and their disabled ends; a new note appears first after a reorder; Move to… puts the item first in the destination; an untouched folder still shows newest first; search and renaming still disable dragging; verify all checks pass
- [x] 3.2 Update the README's item-tree notes (order is manual within groups; dragging reorders; Move to… moves) and run lint, unit, and integration tests; verify they pass
- [ ] 3.3 Push a branch and check the preview; merge to `main` and verify on production that a note dragged to the top of a folder stays there after a reload
