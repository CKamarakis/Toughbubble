# Design

## Context

See proposal.md for motivation. In `src/components/workspace/workspace-context.tsx`:

- `tb:expanded` (localStorage, via `useStoredValue`) holds the ids the user expanded.
- `isExpanded(id) = expanded.has(id) || openAncestors.has(id)`, where `openAncestors` is every ancestor of the item in the URL (`ancestorPath(rows, currentId)`). That OR is the bug: an ancestor of the open item is shown expanded whatever the user chose.
- Creating an item and moving one already call `setExpanded(parentId, true)`, which saves it.
- Search passes its own `forceOpen` set to the tree and ignores `isExpanded`; `tree-dnd.tsx` reads `isExpanded` to auto-expand drop targets.

## Goals / Non-Goals

**Goals:**
- Every project and folder can be collapsed, whatever is open.
- Opening an item still reveals it in the sidebar.

**Non-Goals:**
- Server-rendering the expanded state (still read after hydration, as noted in Phase 1).

## Decisions

### D1. Reveal once, into the saved state
- `isExpanded(id)` becomes `expanded.has(id)`.
- An effect runs when the open item (`currentId`) or the loaded rows change: if `currentId` differs from the last revealed id, it adds the item's ancestors to `tb:expanded` (one write) and records `currentId` as the last revealed id.
- The last revealed id lives in localStorage (`tb:revealed`), so a reload on the same item doesn't reveal again (spec: "Collapsed path survives reload"), while opening any other item, including from a link in another tab, does.
- The ancestor merge is a pure helper, `revealAncestors(expandedIds, ancestorIds): string[] | null` in `src/lib/tree/`, returning null when nothing would change (so no write, no re-render).
- Alternative: keep forcing ancestors open but track "collapsed while open" separately. Rejected: two sources of truth for one state, and it reproduces the bug whenever the two disagree.
- Alternative: reveal on every page load. Rejected: contradicts "Expanded state survives reload" when the open item is inside the collapsed project.

### D2. Rows not loaded yet
- The effect waits until `rows` contains `currentId` (a just-created item appears after the optimistic update), so the ancestors can be found; it doesn't record `tb:revealed` until then.

### D3. Clicking a container's name
- The name link in `sidebar-tree.tsx` gets an `onClick` for projects and folders. A plain left click (no Ctrl/Cmd/Shift/Alt, button 0): if the container is already the open item, prevent navigation and toggle it (`setExpanded(id, !open)`); otherwise expand it and let the link navigate. Modified clicks and middle clicks fall through to the browser (new tab) with no state change.
- Enter on the focused link fires the same click, so the keyboard behaves the same.
- The one-time reveal (D1) doesn't cover the item itself, only its ancestors, so expanding on the name click is what shows a just-opened container's contents.
- Alternative: the name only toggles and never navigates. Rejected: the project page would then need another way in (menu or breadcrumb), and the name is the natural way to open it.

## Risks / Trade-offs

- [The saved expanded list grows as the user opens items across the tree] → Same as expanding by hand today; ids of deleted items are harmless and small.
- [Two tabs: revealing in one tab expands the path in the other] → The expanded state is already shared through localStorage; acceptable.
