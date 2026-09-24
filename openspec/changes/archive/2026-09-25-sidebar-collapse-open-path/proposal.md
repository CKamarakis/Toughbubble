# Proposal

## Why

In the sidebar, a project or folder that contains the open item can't be collapsed: clicking its arrow does nothing. The sidebar treats the open item's ancestors as always expanded (Phase 1), so the saved "collapsed" state is overridden for as long as the item is open. Since a note inside a project is usually open, most containers can't be collapsed in practice. Found while using the app.

## What Changes

- **Reveal once, then let go**: when an item becomes the open item (selected in the sidebar, opened from a link, or created), its ancestors are expanded and saved as expanded, once. After that they behave like any other project or folder, so the user can collapse them while the item stays open.
- **Reload keeps the user's choice**: reloading the page on the same item doesn't expand again what the user collapsed. Opening a different item reveals that item.
- **Clicking a name expands too**: clicking a project's or folder's name opens its page and expands it; clicking the name again while its page is open collapses or expands it. The arrow keeps toggling as before. (Clicking a name used to only open the page, which users took for a broken toggle.) Ctrl/Cmd-click and middle-click still just open the page in a new tab.
- Search keeps showing matches inside collapsed containers without changing the saved state (unchanged).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `workspace-tree`: "Expand and collapse" gains scenarios for collapsing a container that holds the open item, a reload keeping that choice, and clicking a container's name (opens and expands; again toggles); "Open items" states that the reveal happens when an item is opened, not permanently.

## Impact

- **Code**: `src/components/workspace/workspace-context.tsx` (expanded state: drop the always-expanded ancestors, add the one-time reveal), `src/components/workspace/sidebar-tree.tsx` (name click), a small pure helper in `src/lib/tree/` with unit tests.
- **Stored data**: one more `localStorage` key for the last revealed item; `tb:expanded` is unchanged.
- **Database, dependencies**: none.
