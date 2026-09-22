# Tasks

## 1. Database

- [x] 1.1 Add `edited_at` (timestamptz, not null, default `now()`) and a `'a0'` default for `position` to `src/db/schema.ts` and generate the migration; verify `npm run db:migrate` applies it to dev and existing rows have `edited_at` set
- [x] 1.2 Write a custom Drizzle migration adding `items_container_check`, `items_cycle_check`, and the deferred `items_active_parent_check` constraint trigger per D4; verify it applies to dev and `pg_trigger` lists all three
- [x] 1.3 Add integration tests for the triggers: parent is a note/Storm rejected, folder-with-children to note rejected, self-parent and descendant-parent rejected, active item under archived/trashed parent rejected at commit; verify `npm run test:integration` passes

## 2. Tree logic (pure, unit-tested)

- [x] 2.1 Implement `src/lib/tree/build.ts`: flat rows to a tree, ancestor path for an id, default titles per kind; verify with unit tests
- [x] 2.2 Implement `src/lib/tree/order.ts`: the fixed sidebar comparator (projects, folders, then notes and Storms; newest `created_at` first; `id` tie-break) and the five contents sorts within groups (Newest, Oldest, Last edited, A–Z, Z–A with `Intl.Collator`, defaults for empty titles); verify with unit tests covering the spec's grouping scenario and each sort
- [x] 2.3 Implement `src/lib/tree/search.ts`: case-insensitive title filter keeping ancestors of matches and returning the ids to force-expand; verify with unit tests including "no matches"
- [x] 2.4 Implement `src/lib/tree/destinations.ts`: valid move destinations and drop targets for an item (root, projects, folders; excluding the current parent, the item's subtree, notes, and Storms); verify with unit tests

## 3. Tree Server Actions

- [x] 3.1 Implement `createItem`, `renameItem`, `setProjectStyle`, and `convertItem` in `src/lib/tree/actions.ts` with input validation, `edited_at` updates for edits, and `revalidatePath`; verify with integration tests for defaults, conversion clearing icon/color, and `edited_at` changing on rename
- [x] 3.2 Implement `moveItem` taking `{ itemId, parentId | null }`, setting `edited_at`, and mapping trigger rejections to user messages; verify with integration tests for move into a container, move to root, and each rejection
- [x] 3.3 Implement `archiveItem`, `trashItem`, `restoreItem`, and `deleteForever` as the set-based statements in D3; verify with integration tests for cascade, "separately trashed stays in Trash", "parent no longer active restores to root", trashing an archived item, delete-forever cascade, delete-forever refused for non-trashed items, and `edited_at` unchanged by all four
- [x] 3.4 Add integration tests that another user cannot affect a user's items through any tree action; verify they pass

## 4. Sidebar shell

- [x] 4.1 Add shadcn/ui dropdown menu, dialog, and tooltip components and install `@dnd-kit/core` and `@dnd-kit/utilities`; verify `npm run build` succeeds
- [x] 4.2 Replace the workspace header with the sidebar layout: search box, New menu, tree area, Archive and Trash links, account footer (email, theme control, sign out), collapsible below `md`; the layout loads the active tree per D1; verify in the browser that sign-out and the theme control still work
- [x] 4.3 Render the tree in the fixed order from `order.ts` with kind icons, project icon/color, expand/collapse persisted in `localStorage`, and the empty state; verify in the browser that the grouping matches the spec and collapsed state survives reload
- [x] 4.4 Add the item row menu (New inside for containers only, Rename, Move to…, Convert, Archive, Move to Trash) and inline rename (Enter saves, Escape cancels); verify in the browser that notes and Storms offer no "New inside"
- [x] 4.5 Wire title search to `search.ts` with "No matching items" and restoring the expanded state on clear; verify in the browser

## 5. Main pane

- [x] 5.1 Build `/items/[id]`: breadcrumb, editable title, project icon/color picker, placeholder for notes/Storms, `notFound()` for missing, foreign, archived, or trashed items; verify in the browser including a trashed item's old URL
- [x] 5.2 Build the contents list for project and folder pages: kind groups, icon, title, created and last edited dates, sort menu (Newest default, Oldest, Last edited, A–Z, Z–A) remembered in `localStorage` and not affecting the sidebar, subfolders expanding in place, empty state with create; verify each sort and the remembered choice after reload in the browser
- [x] 5.3 Opening an item by URL expands its ancestors and highlights it in the sidebar; creating an item selects it and focuses its title; verify in the browser
- [x] 5.4 Update the home page to a welcome/empty state that offers creating a first item; verify in the browser

## 6. Moving

- [x] 6.1 Build the "Move to…" dialog from `destinations.ts`, searchable and fully keyboard operable; verify a keyboard-only move in the browser
- [x] 6.2 Implement drag and drop into projects, folders, and the root strip with `@dnd-kit/core`, invalid targets showing no drop indicator, auto-expand on hover, optimistic update with revert on error; verify in the browser that a drag into a folder and to the root persists after reload and that dragging within the same container changes nothing

## 7. Archive and Trash

- [x] 7.1 Build `/archive` and `/trash` views listing root items (kind, title, date, newest first) with Restore, Move to Trash (Archive), and Delete forever with confirmation (Trash); verify in the browser
- [x] 7.2 Run the browser check script end to end: create, rename, style, convert, sidebar order, contents sorts, drag, Move to…, search, archive, trash, restore (including restore-to-root), delete forever, expanded state after reload; verify all checks pass on a production build

## 8. Release

- [x] 8.1 Update README (tree actions, `edited_at` rule for future edit paths, trigger migration note); verify lint, unit, and integration tests pass
- [x] 8.2 Push a branch and verify the preview deploy in the browser; apply the migrations to prod with `.env.prod-migrate` and verify the column and triggers exist there; merge to `main` and verify the tree on production
