# Proposal

## Why

After Phase 0 a signed-in user lands in an empty workspace and can do nothing with it. Every later phase (the note editor, attachments, Storms) needs a place to create, find, and organise items, so the item tree and the Notion-style sidebar come next. The data model for this (one tree, fractional ordering, cascade markers) already exists; this phase puts behaviour and UI on top of it.

## What Changes

- **Sidebar app shell** replacing the Phase 0 header: title search, a "New" menu, the item tree, Archive and Trash entries, and the account area (email, theme toggle, sign out). The main pane shows a breadcrumb and the selected item.
- **Create** projects, folders, notes, and Storms at the root or inside a project or folder. Notes and Storms open to a placeholder page until their editors arrive (Phases 2 and 4).
- **Rename** any item; **edit project icon and color**; **convert** a folder to a project and back.
- **Fixed sidebar order**: at every level projects first, then folders, then notes and Storms, each group newest first. No manual reordering.
- **Project and folder pages** list their contents (grouped the same way) with a sort menu: Newest, Oldest, Last edited, A–Z, Z–A, remembered per browser. Subfolders expand in place for a quick review.
- **Move** items into a project or folder, or to the root, by drag and drop in the sidebar, plus a "Move to…" dialog that works without a mouse. Only projects and folders can contain items; an item can never be moved into itself or its own descendants.
- **Expand/collapse** containers in the sidebar, remembered per browser.
- **Title search** filtering the tree as you type (active items only).
- **Archive and Trash** actions that cascade to the whole subtree, simple Archive and Trash views, **Restore** (brings the whole subtree back; goes to the root level if its old parent is no longer active), and **Delete forever** from Trash.
- **Database-enforced tree rules**: only projects and folders can have children, no cycles, and new or moved items only go under an active parent.

## Capabilities

### New Capabilities

- `workspace-tree`: the sidebar tree and main-pane navigation: creating, opening, renaming, project icon/color, folder/project conversion, the fixed sidebar order, contents pages with sorting, moving, expand/collapse, and title search.
- `archive-trash`: archiving and trashing items with subtree cascade, the Archive and Trash views, restore, and permanent deletion.

### Modified Capabilities

- `workspace-data`: adds tree-integrity requirements (containers-only children, no cycles, active parent) enforced by the database. Existing requirements are unchanged.

## Impact

- **Code**: new sidebar and item pages under `src/app/(workspace)/`, tree Server Actions using `withUserDb`, tree-building and position helpers; the Phase 0 workspace header is replaced by the sidebar.
- **Database**: an `edited_at` column on `items` (for the Last edited sort), a default for the now-unused `position` column, and tree-integrity triggers. `project_status` stays unused (project status is out of scope).
- **Dependencies**: `@dnd-kit/core`, `@dnd-kit/utilities`; shadcn/ui dropdown menu, dialog, and tooltip components.
- **Not in this phase**: note editor (Phase 2), Storm canvas (Phase 4), full-text search, bulk Trash actions, 30-day auto-purge, project status (later), mobile layout.
