# Tasks

## 1. Account menu

- [x] 1.1 Look up in the Base UI docs (via context7, for the installed `@base-ui/react` version) how a menu radio item stays open on click and how a menu item renders as a link. Verify the prop names against `node_modules/@base-ui/react` types.
- [x] 1.2 Add `account-menu.tsx` per D1–D3: the trigger row (avatar, email, chevron, `aria-label`), Settings link item, Theme radio group with the mounted guard, and Sign out submitting the hidden form. Verify types and lint pass.
- [x] 1.3 Replace the sidebar footer per the spec: Archive and Trash links, then the account menu. Remove the Settings row, `ThemeToggle` and the Sign out button from the sidebar. Add the Settings highlight per D4. Verify in the browser at 1440×900 and 390×844 (touch) that the footer has three rows, and that the sign-in page still shows its theme control.

## 2. Behavior checks

- [x] 2.1 In the browser, verify each scenario of the Account menu requirement:
  - The menu opens with Settings, Light, Dark, System and Sign out, with the current theme marked.
  - Choosing Dark switches the theme, keeps the menu open, and the choice survives a reload.
  - Settings opens the Settings page, and the account row is highlighted there.
  - Sign out lands on the sign-in page, and Back doesn't reopen the workspace.
  - Keyboard: Enter opens, arrows move, Enter picks, and Escape returns focus to the row.
  - On a phone, the panel's footer takes three rows.
- [x] 2.2 Update the README's sidebar notes (account menu, hidden sign-out form) and verify that they match the code.

## 3. Release

- [x] 3.1 Run types, lint, unit and integration tests. Verify that all pass.
- [ ] 3.2 Push the branch. After the user approves, merge to `main` for a phone check.
