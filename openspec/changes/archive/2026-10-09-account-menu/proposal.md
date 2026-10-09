# Proposal

## Why

The phone check after phone-comfort (2026-10-09) showed that the bottom of the sidebar takes too much height: Archive, Trash, Settings, the account email, the theme control and Sign out sit on six rows, about a third of the panel on a phone. Settings, theme and Sign out are used rarely, some about once a year, so they don't need to be visible all the time. The tree, which is used constantly, should get that space, on desktop as well as phones.

## What Changes

- **Account menu**: the account email row at the bottom of the sidebar becomes a button. It opens a menu with Settings, the theme choice (Light, Dark, System) and Sign out.
- **Archive and Trash stay** as visible rows above it, as today.
- **Fewer rows**: the separate Settings row, the theme control and the Sign out row disappear from the sidebar. The bottom block goes from six rows to three (Archive, Trash, account).
- **Where am I**: on the Settings page, the account row shows the current-page highlight, as a sidebar link would.
- Desktop and phone get the same layout.
- The sign-in page keeps its own theme control, unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-tree`: adds the account menu at the bottom of the sidebar.
- `editor-settings`: the Settings page is reached from the account menu instead of its own sidebar row.

## Impact

- `src/components/workspace/sidebar.tsx`: new footer layout. A new `account-menu.tsx` component holds the menu.
- `ThemeToggle` stays in use on the sign-in page only.
- No data, auth, server or migration changes. Sign-out keeps posting to `/auth/sign-out`.
