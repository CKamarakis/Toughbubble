# Proposal

## Why

A real-phone check of the live app on 2026-10-08 (after shell-hardening) gave one clear message: on a phone everything feels too small to read or tap, in the sidebar and on the pages. The app is still sized for a desktop: most text is 14px, secondary text 12px, menu entries about 32px tall, and the sidebar panel is 256px wide, so titles get cut off ("How to write a ti…"). Phones read best at 16px and up, with tap targets of 44px.

## What Changes

- **Phone sizing for the whole app**: on touch screens the interface (sidebar, item pages, contents lists, Archive, Trash, Settings, menus, dialogs, toasts) is drawn larger, so regular text is 16px and secondary text (dates, counts, hints) is at least 13px. Note text keeps the size chosen in editor settings.
- **44px tap targets on touch screens**: sidebar rows, the row "⋯" and expand buttons, menu entries, list rows, and page buttons are at least 44px tall.
- **Wider sidebar panel on phones**: the small-screen panel takes about 85% of the screen width (at most 360px) instead of a fixed 256px, so titles are cut off less.
- **Desktop unchanged**: devices with a mouse or trackpad keep today's sizes.
- **No zoom on search**: because inputs reach 16px, iPhones no longer zoom the page when the search field is focused.

Out of scope: the item menu changes from the same phone check (a "+" on project and folder rows, To top / To bottom, clearer Convert), which are a separate change, `item-menu-actions`. Also out of scope: layout changes beyond sizing, and the note editor's own text sizes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-theme`: adds a requirement for comfortable sizes on touch screens (text, tap targets) while leaving devices with a fine pointer unchanged.
- `workspace-tree`: adds a requirement for the width of the small-screen sidebar panel.

## Impact

- `src/app/globals.css`: a touch-screen scale rule.
- Small class tweaks where a size is fixed in pixels or a target still falls short: `sidebar-tree.tsx`, `workspace-shell.tsx`, `ui/dropdown-menu.tsx`, `contents-list.tsx`, possibly `ui/button.tsx`.
- No data, auth, server or migration changes. The note editor is untouched.
