# Design

## Context

See proposal.md for motivation. Current state:

- `items.position` is `text COLLATE "C"`, default `'a0'`, unused since Phase 1 dropped manual order. `fractional-indexing` is installed (`src/db/position.test.ts` checks its keys sort correctly under the collation).
- `sidebarCompare` (`src/lib/tree/order.ts`) sorts by kind group, then `created_at` descending, then id. Contents pages use `contentsCompare` with their own sort options.
- `tree-dnd.tsx` uses `@dnd-kit/core` only: rows are draggable, projects and folders and a "Move to top level" strip are drop targets, and a drop calls `ws.move`. Hovering a collapsed folder while dragging expands it after 600 ms.
- Tree mutations are Server Actions with optimistic updates (`applyChange` in `workspace-context.tsx`) and `revalidatePath("/", "layout")`.
- `TreeRow` (loaded for the sidebar) has no `position`.

## Goals / Non-Goals

**Goals:**
- One meaning per drag: reorder among siblings of the same group.
- No data migration, and no visible change until a user reorders.
- Reordering is instant (optimistic) and survives concurrent edits without corrupting the order.

**Non-Goals:**
- A "Manual" option on project and folder pages (they keep their sort options).
- Mixing kinds within a level.

## Decisions

### D1. Order: group, then position, then newest
- `sidebarCompare` becomes: kind group, then `position` ascending (byte order, as the column's collation), then `created_at` descending, then id.
- Rows that were never reordered all hold `'a0'`, so they tie on position and fall back to newest first: today's order, with no migration.
- `TreeRow` gains `position`; the tree queries select it.

### D2. Reorder writes the whole group
- Server Action `reorderGroup(parentId | null, group, orderedIds)`: in one transaction, loads the active siblings of that parent in that kind group, requires the ids to be exactly that set (else returns a "list changed" error and the client refreshes), and writes `generateNKeysBetween(null, null, n)` to them in the given order.
- Rewriting the group (not one key between two neighbours) is needed because untouched groups have equal keys (`'a0'`) with nothing between them; groups are small, so this is a handful of rows.
- The client applies the same keys optimistically (`applyChange` gets a `reorder` case), so the row moves at once.
- After a successful save, the saved positions are also kept as a client-side override until the server's rows show them (like the `touched` edited times). Found during the browser check: rarely (2 in ~50 runs, right after a page load) a server render that started before the save put the old order back until the next refresh. Not reproduced since the override was added (6 of 6 full runs).
- Reordering doesn't change `edited_at` (it isn't an edit of the item; the README rule lists what is).
- Alternative: store one key per item between its new neighbours. Rejected: fails on tied default keys and needs the same group rewrite as a fallback anyway.

### D3. New and moved items go to the top of their group
- `createItem` and `moveItem` set `position` to a key before the smallest key in the destination group (`generateKeyBetween(null, min)`, or `'a0'` for an empty group), read in the same transaction.
- For a group that was never reordered (all `'a0'`), this gives a key below `'a0'`, so the new item is first, as today.
- Two items created at the same moment can get the same key; they then order by creation time, which is harmless.
- Converting a folder to a project (or back) keeps its key: it joins the other group at that key's place.

### D4. Drag and drop: reorder only
- Keep `@dnd-kit/core` (no `@dnd-kit/sortable`: the tree isn't a flat list and only needs a line indicator).
- Every row is a drop target, but a target is accepted only if it has the same parent and kind group as the dragged item. The landing side (above or below) comes from the pointer's position in the target row's top or bottom half; a 2 px line is drawn at that edge. Other rows show nothing, and dropping there does nothing.
- The drop computes the new ordered id list of the group and calls `ws.reorder`.
- Removed: dropping onto a container, the "Move to top level" strip, and auto-expanding folders while dragging.
- Still disabled while searching or renaming, as now.

### D5. Move up / Move down
- The item menu gets "Move up" and "Move down" (disabled at the group's ends); each swaps the item with its neighbour and calls `ws.reorder` with the new list. They sit next to "Move to…".

## Risks / Trade-offs

- [Two tabs reorder the same group at once] → The second write's id set still matches, so the last reorder wins; the other tab updates on its next refresh. No corruption: every write replaces the whole group's keys.
- [A sibling is created in another tab while dragging] → The id set no longer matches; the action refuses, the tree refreshes, and the user drags again. Rare for one user.
- [Users relied on dragging into folders] → Move to… covers it; the removed behavior is called out in the proposal.
- [Restoring an archived or trashed item] → It keeps its old key and returns near its old place; acceptable.

## Migration Plan

No database migration. Deploy as usual. Rollback: revert the commit; the older version ignores `position`, so reordered groups simply show newest first again.
