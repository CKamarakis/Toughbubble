# Proposal

## Why

The first design critique of the app shell and sidebar (26/40, `.impeccable/critique/2026-10-08T12-07-21Z__src-components-workspace-workspace-shell-tsx.md`) found two P1 problems and three P2 ones. On a phone the row actions can't be found and rows are too small to tap. Archive and Trash can't be undone from where they happen. The small-screen sidebar can't be closed with Escape and doesn't move focus. In addition, the current item looks the same as a hovered one, some light-mode controls disappear into the sidebar, and the row menu shows 11 options at once. These are the most common actions in the app, so they come before new features.

## What Changes

- **Undo for Archive and Trash**: the confirmation toast after archiving or trashing from the sidebar or an item page offers Undo, which restores the item (and what went with it) to its place. If the user was on that item, Undo takes them back to it.
- **Small-screen sidebar as a proper panel**: below the `md` breakpoint the sidebar opens as a modal panel. Escape and a visible close button close it, focus moves into it and stays there, the page behind can't be reached, and focus returns to the open button on close. The top bar shows the current item's title next to the open button.
- **Touch-friendly rows**: on touch screens the row "⋯" button is always visible, rows are at least 40px tall, and a long press on a row opens its menu without starting a drag.
- **Current item marker**: the open item's row gets a small magenta mark at its left edge (an accent "bookmark"), so it differs from a hovered row. In dark mode the current row's icon may take the yellow accent.
- **Visible light-mode controls**: the theme control's track and the account avatar get a fill that stands out from the sidebar (3:1 for non-text UI).
- **Calmer row menu**: the four "New … inside" items move into one "New inside" submenu, and "Move up" / "Move down" move into a "Reorder" submenu. Rename, Move to…, Convert, Archive and Move to Trash stay at the top.
- **One date format**: dates in the contents table and in Archive and Trash use the same format, the browser's locale.
- **New stays available**: the New buttons are no longer disabled while an unrelated change (rename, archive, move) is saving.

Out of scope (separate changes): sidebar modes (icon strip and full-screen note), a playful Home, the image lightbox, keyboard arrow navigation in the tree.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `archive-trash`: adds Undo from the confirmation after archiving or trashing.
- `workspace-tree`: adds the small-screen sidebar panel, touch-friendly rows, the current item marker, the row menu layout and consistent dates; changes Create items (New inside submenu, New not blocked by saves) and Reorder items (Move up/down in a Reorder submenu).
- `app-theme`: adds a requirement that controls stay visible against their background in both themes.

## Impact

- **Code**: `src/components/workspace/workspace-shell.tsx` (panel, top bar), `workspace-context.tsx` (Undo toasts), `sidebar-tree.tsx` (marker, touch rows, long press), `tree-dnd.tsx` (touch activation), `item-menu.tsx` (submenus, open from long press), `sidebar.tsx` (avatar), `src/components/theme-toggle.tsx` (track), `format-date.tsx` (one format), `new-item-menu.tsx` and `new-inside-menu.tsx` (pending), `src/components/ui/dropdown-menu.tsx` (submenu parts if missing).
- **Server**: none. Undo reuses the existing `restoreItem` action.
- **Data**: no schema or migration changes.
- **Dependencies**: none expected; the panel is built from the existing Base UI dialog.
