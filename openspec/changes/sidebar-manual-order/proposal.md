# Proposal

## Why

The sidebar order is fixed (kind groups, newest first), so a note a user cares about can end up anywhere in a long folder, and finding it means scanning. Users want to arrange items themselves. Phase 1 deliberately left this out but kept the `position` column so manual order could be added later.

## What Changes

- **Drag to reorder**: in the sidebar, a user drags an item to a new place among its siblings, within the same project or folder (or the top level) and within its kind group: projects among projects, folders among folders, notes and Storms among notes and Storms. A line shows where it will land. The order is saved and applies on every device.
- **BREAKING (behavior): dragging no longer moves items between containers.** Dropping on a folder or project, and the "Move to top level" strip, go away. **Move to…** in the item menu is the way to move an item elsewhere. Every drag now means one thing.
- **Keyboard**: "Move up" and "Move down" in the item menu reorder within the group.
- **New and moved items** appear at the top of their group, as new items do today.
- **Nothing moves on update**: until a user reorders a group, it keeps today's order (newest first).
- Unchanged: groups (projects, then folders, then notes and Storms), the project and folder pages' own sort options, search.
- Not in this change: sorting options for the sidebar, favorites or pins.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `workspace-tree`: "Sidebar tree" (order within a group is the user's, newest first until changed), "Move items" replaced by "Move items with Move to" (dragging removed; Move to… only; a moved item goes to the top of its group), and a new "Reorder items" requirement (drag within the group, Move up / Move down, saved).

## Impact

- **Code**: `src/lib/tree/order.ts` (sidebar compare uses `position`), `src/lib/tree/operations.ts` and `actions.ts` (reorder action; create and move put the item at the top of its group), `src/components/workspace/tree-dnd.tsx` (reorder instead of move-into), `workspace-context.tsx` (optimistic reorder), `item-menu.tsx` (Move up / Move down), `TreeRow` gains `position`.
- **Database**: no migration. The existing `position` column (byte-order collation, default `'a0'`) is used; rows that all still have the default tie and fall back to newest first, which is today's order.
- **Dependencies**: none new (`fractional-indexing` and `@dnd-kit/core` are already installed).
