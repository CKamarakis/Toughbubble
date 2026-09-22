# Design

## Context

See proposal.md for motivation. Phase 0 left:

- `items` / `item_content` tables with RLS, same-owner composite FKs, `position text COLLATE "C"` (fractional-indexing keys), `status`, `status_root_id`, `status_changed_at`, `icon`, `color`, `project_status`.
- `withUserDb(fn)` as the only database entry point for app code; Server Actions in `src/lib/auth/actions.ts` as the pattern for mutations.
- `(workspace)/layout.tsx` with a top header (email, theme toggle, sign out) and an empty-workspace page that counts items.
- shadcn/ui on Base UI (`@base-ui/react`), Tailwind 4, Next.js 16, Vitest unit and integration projects, Playwright-style browser checks run from a scratch script.

Decisions carried from earlier exploration: archive/trash status is written to every affected descendant with `status_root_id` set to the item acted on; restoring an item whose parent is not active puts it at the root level. The earlier plan for manual sibling order with fractional keys is superseded by the fixed order in D1 (decided while reviewing this change).

## Goals / Non-Goals

**Goals:**
- Tree rules (containers only, no cycles, active parent) hold for every write path, not only the UI.
- Every mutation touches as few rows as possible: a move writes one row.
- Ordering is computed, never stored: the sidebar and contents pages sort in memory, so no mutation rewrites sibling positions.
- The tree is fully usable by keyboard (drag and drop has a dialog alternative).

**Non-Goals:**
- Virtualising the tree. A personal workspace stays in the hundreds of items; revisit past a few thousand.
- Real-time sync between tabs. A second tab sees changes on its next navigation or reload.
- Multi-select, bulk actions, auto-purge, project status, full-text search.

## Decisions

### D1. Data loading: the whole active tree, once per navigation
The workspace layout loads every active item for the user (id, parent, kind, title, icon, color, created_at, edited_at) in one query through `withUserDb` and passes it to the client sidebar, which builds the tree in memory. Archive and Trash views load their own lists.

- Alternative: load children lazily per expanded node. Rejected: more round trips and harder search, for no benefit at this size.
- **Sidebar order is fixed and computed**: at each level, group by kind (project, folder, then note and Storm together), then `created_at` descending, then `id` as a tie-break. Implemented as one comparator in `src/lib/tree/order.ts`, shared with the contents page.
- **`position` is no longer used.** Manual order was dropped in favour of the fixed order. The column stays (dropping it gains nothing, and a future "manual order" option could reuse it); the migration gives it the default `'a0'` so inserts need not set it.
- **`edited_at` (new column, not null, default `now()`)** records the last user edit: set to `now()` by the rename, restyle, convert, and move actions, and (Phase 2) by content saves. `updated_at` is not reused because archive, trash, and restore also change it, and the spec does not count those as edits.

### D2. Mutations: Server Actions in `src/lib/tree/actions.ts`
One action per operation (`createItem`, `renameItem`, `setProjectStyle`, `convertItem`, `moveItem`, `archiveItem`, `trashItem`, `restoreItem`, `deleteForever`), each validating input, running in one `withUserDb` transaction, then calling `revalidatePath` for the workspace layout.

- **The client sends intent only** (`{ itemId, parentId | null }` for a move); the server validates and writes. There is no position to compute.
- **The client updates optimistically** (moves the node immediately) and reconciles with the refreshed layout data; on error it reverts and shows a toast.
- Alternative: Route Handlers + fetch. Rejected: Server Actions already carry the session and match the Phase 0 pattern.

### D3. Archive, trash, restore as set-based updates
Each is one SQL statement using a recursive CTE over `parent_id`, run as the user (RLS applies):

```
archive(X):  descendants-or-self of X where status = 'active'
             -> status='archived', status_root_id=X, status_changed_at=now()
trash(X):    descendants-or-self of X where status <> 'trashed'
             -> status='trashed',  status_root_id=X, status_changed_at=now()
restore(X):  rows where status_root_id = X
             -> status='active', status_root_id=null, status_changed_at=null
             and, if X's parent is not active: X.parent_id=null
delete(X):   DELETE X where status='trashed' (FK cascade removes the subtree and content)
```

- Trash includes archived descendants (their earlier archive root is replaced), so they come back **active** when the trashed root is restored. Items already trashed separately keep their own root and stay in Trash on restore (matches the spec's "separately trashed items stay in Trash").
- Archive skips items already archived or trashed, so separately archived or trashed descendants keep their own roots.
- Archive and Trash views list rows where `status_root_id = id` (the item acted on), newest `status_changed_at` first.

### D4. Tree integrity in the database
A migration adds trigger functions on `items`:

| Rule | Trigger | Timing |
|---|---|---|
| Parent is a project or folder; an item with children cannot become a note or Storm | `items_container_check` | `BEFORE INSERT OR UPDATE OF parent_id, kind`, row level |
| No cycles: walk ancestors of the new parent; reject if the item itself appears | `items_cycle_check` | `BEFORE UPDATE OF parent_id`, row level (an INSERT cannot create a cycle) |
| An active item's parent is active | `items_active_parent_check` | `CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED`, `AFTER INSERT OR UPDATE OF parent_id, status` |

- The active-parent check is **deferred to commit** because restore flips a whole subtree to active in one statement; a row-level check would see a child before its parent is updated and reject a valid restore.
- Triggers run with the caller's rights; RLS limits the rows they read to the user's own, which is all they need.
- Alternative: enforce only in Server Actions. Rejected: the workspace-data spec requires the database to hold these rules for every write path, as Phase 0 did for ownership.

### D5. Drag and drop: move into containers only
`@dnd-kit/core` only (no `@dnd-kit/sortable`): every tree row is draggable, and projects, folders, and a "root" strip at the top of the tree are drop targets. Dropping on the item's current parent, on itself, on its descendants, or on a note or Storm is not allowed and shows no drop indicator. Because the order is fixed, there is no insertion line and no depth-from-pointer logic.

- A **"Move to…" dialog** lists valid destinations (root + projects/folders, excluding the item's subtree) as a searchable, keyboard-operable list. It is the accessible path. dnd-kit's keyboard sensor is not used: its draggable attributes would add a tab stop (and `role="button"`) to every tree row.
- **Collision detection is `pointerWithin`** with droppables re-measured throughout the drag (`MeasuringStrategy.Always`). Found in browser testing: the default rectangle-overlap detection, measured at drag start, targeted the wrong rows once the top-level strip appeared and shifted them.
- Collapsed containers auto-expand after hovering ~600 ms during a drag.
- Alternative: `react-arborist` (tree semantics, keyboard, DnD built in). Rejected: its reordering features would go unused, its styling and internals (react-dnd) fight the shadcn/Base UI look, and dnd-kit is the library already named in the project context.

### D6. Routes and layout
```
(workspace)/layout.tsx        sidebar + main pane; loads the active tree (D1)
(workspace)/page.tsx          home: welcome / empty state
(workspace)/items/[id]        item page: breadcrumb, editable title, project style,
                              contents list with sort menu (containers, D7)
                              or placeholder (note/Storm)
(workspace)/archive           Archive view
(workspace)/trash             Trash view
(workspace)/reset-password    unchanged
```
- The item page loads the item with `withUserDb` and calls `notFound()` if it is missing, not the user's, or not active (the spec treats all three the same).
- The Phase 0 header moves into the sidebar footer; the mobile layout is out of scope, but the sidebar collapses to a toggle below `md` so nothing is unreachable.

### D7. Client state
- **Expanded state**: `localStorage` key `tb:expanded` holding expanded container ids, read in an effect; ancestors of the open item are always expanded.
- **Search**: filters the in-memory tree; a node is shown if its title matches (case-insensitive substring) or any descendant matches, and matching ancestors are force-expanded while searching without overwriting the saved expanded state.
- **Contents sort**: `localStorage` key `tb:contents-sort` holding one of `newest | oldest | edited | az | za` (default `newest`), shared by all project and folder pages and never applied to the sidebar. Sorting applies within the kind groups; A–Z and Z–A compare titles (kind defaults for empty ones) with `Intl.Collator`, case-insensitive and numeric-aware. Expanding a subfolder in the list reuses the loaded tree, so it needs no request.
- **Titles**: empty titles are stored as `''` and rendered as the kind's default ("Untitled project", etc.); the default is not written to the database.

### D8. Project style presets
- **Icons**: a small curated set of Lucide icons (about 16) stored by name in `icon`.
- **Colors**: 8 preset swatches stored as token names (e.g. `yellow`, `magenta`, `purple`, `green`, `amber`, `blue`, `slate`, `default`) in `color`, each mapped to light and dark values that meet 3:1 against the sidebar background (icon, non-text).
- Converting a project to a folder clears `icon` and `color`; converting a folder to a project leaves them null (default look) until chosen.

### D9. Testing
- **Unit**: tree building from flat rows, the sidebar comparator (grouping + newest first), the five contents sorts, search filtering, valid drop targets and "Move to…" destinations, title defaults.
- **Integration (dev DB)**: each Server Action's SQL through `runAsUser`: create, move (sets `edited_at`; archive, trash, and restore do not), the three triggers (including restore passing the deferred check), archive/trash/restore cascades including the "separately trashed stays" and "parent no longer active" cases, delete forever cascade, RLS on all of them.
- **Browser (scratch Playwright script)**: create, rename, sidebar order, each contents sort (remembered after reload), subfolder expand in the contents list, drag into a folder and to the root, Move to…, search, archive/trash/restore/delete forever, expand state after reload, keyboard-only move.

## Risks / Trade-offs

- [Deferred constraint trigger errors surface at COMMIT, after the action's statements ran] -> actions map the error (SQLSTATE from the trigger's `RAISE`) to a user message; integration tests cover the path.
- [No manual ordering: a user cannot pin an item to the top] -> by design for now; the unused `position` column keeps a "manual order" option cheap to add later.
- [`edited_at` must be set by every edit path, including Phase 2 content saves] -> set only inside the tree actions and (Phase 2) the save action; integration tests assert which actions change it.
- [Optimistic updates can drift from the server] -> every action revalidates the layout; the client replaces its optimistic tree with server data after each response.
- [Expanded state and contents sort live in `localStorage`, which the server cannot read] -> after a full page load the tree renders collapsed (and the sort label shows Newest) for a moment, then applies the stored choice. Accepted for now; a cookie would let the server render it but caps how many ids fit.
- [Next.js runs Server Actions one at a time; a reload within about a second of several quick actions can drop the last queued one] -> the optimistic UI shows the change until then; acceptable at personal scale. Each action takes ~0.7 s from a local server to the Ireland database and should be faster from Vercel's Dublin region.
- [Loading the whole tree on every navigation] -> small payload at personal scale; measure when Phase 2 adds content, and move to cached data if needed.
- [Trash restore brings separately archived descendants back as active, not archived] -> acceptable and simpler; documented in D3.
- [Recursive CTE and ancestor walks on deep trees] -> depth is small in practice; `items_owner_parent_position_idx` covers child lookups.

## Migration Plan

1. Add `edited_at` and the `position` default to the Drizzle schema and generate that migration; generate a custom migration with the three trigger functions and triggers; apply both to dev and run integration tests.
2. Deploy code to a preview; verify in the browser.
3. Apply the migration to prod (`.env.prod-migrate`), then merge to `main`.
Rollback: the migrations only add a column, a default, and triggers; a forward migration can drop them. Existing rows get `edited_at = now()`.

## Open Questions

- None blocking. Exact icon set and color values are chosen during implementation within D8's constraints.
