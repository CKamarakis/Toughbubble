# Design

## Context

See proposal.md (Why). The relevant code today:
- `item-menu.tsx` holds the "⋯" menu with the "New inside" and "Reorder" submenus (Move up / Move down via `movedOneStep` in `src/lib/tree/reorder.ts`), plus a Convert entry calling `ws.convert`.
- `ws.reorder(parentId, group, orderedIds)` rewrites a group's order optimistically and on the server.
- Sidebar rows (`sidebar-tree.tsx`) show chevron, icon, title link and the "⋯" trigger (hover-revealed, always shown with `pointer-coarse:`).
- The item page (`item-view.tsx`) shows a kind row ("Project" plus Style) only for projects.

## Goals / Non-Goals

**Goals:**
- Reuse the existing `create`, `reorder` and `convert` paths, so nothing new reaches the server.

**Non-Goals:**
- Wrap in folder.
- Changing drag and drop.
- A confirmation dialog for Convert. It's reversible, apart from the cleared icon and colour, which the hint states.

## Decisions

### D1: `movedToEnd` helper
`movedToEnd(ids, id, "top" | "bottom")` sits beside `movedOneStep` in `reorder.ts`. It returns the group's ids with `id` first or last, or null when it is already there. The menu uses it for both the entries and their disabled state, in the same way as Move up / Move down. It gets unit tests for top, bottom, already at the end, and an unknown id.

### D2: Row "+" as a small menu component
`RowNewMenu` (new, in `new-inside-menu.tsx` beside `NewInsideMenu`) takes an icon trigger shaped like the "⋯" trigger (`size-6`, `pointer-coarse:size-10`) and lists `CREATE_ORDER` items calling `ws.create(kind, parentId)`. It's disabled while `ws.creating` is set.
- In `sidebar-tree.tsx` it sits before "⋯" on container rows only, with the same reveal classes.
- On touch it is always visible. Long press still opens "⋯", unchanged.

**Alternative: open the "⋯" menu straight at "New inside".** Base UI can't open a submenu programmatically in a clean way, and a separate small menu is simpler and faster. Rejected.

### D3: Kind switch on the item page
The kind row shows for projects and folders. `KindSwitch` (new, in `item-view.tsx` or its own file) is a `DropdownMenu` whose trigger is the kind label styled as quiet text with a `ChevronDown`. The menu holds a `DropdownMenuRadioGroup` with Project and Folder.
- Folder has a second line of muted text: "Folders have no icon or colour".
- Picking the other kind calls `ws.convert(id, to)`.
- Style stays beside it for projects only.

The trigger's `aria-label` is "Kind: Project, change".

### D4: Menu entry order
Reorder submenu order: Move to top, Move up, Move down, Move to bottom. Icons: `ArrowUpToLine`, `ArrowUp`, `ArrowDown`, `ArrowDownToLine`. Convert and its `ArrowRightLeft` import are removed from `item-menu.tsx`.

## Risks / Trade-offs

- [Convert is now only on the item page, so it is harder to find from the sidebar] → It's a rare action. The page is one tap away, and the label there explains itself.
- [A fourth button per container row on phones (chevron, +, ⋯) narrows titles] → The panel is now up to 360px wide. If titles still truncate too much, "+" can move behind a long press later.
