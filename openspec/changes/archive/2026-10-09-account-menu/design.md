# Design

## Context

See proposal.md (Why). The sidebar footer in `sidebar.tsx` is two blocks:
- `navLink` rows for Archive, Trash and Settings.
- An avatar-and-email line, then a row with `ThemeToggle` and a `<form action="/auth/sign-out" method="post">` Sign out button.

Menus use the shadcn wrapper on Base UI Menu (`ui/dropdown-menu.tsx`), which already exports `DropdownMenuRadioGroup` and `DropdownMenuRadioItem`. The theme comes from `next-themes` (`useTheme`), with a mounted guard because the saved theme is only known in the browser.

## Goals / Non-Goals

**Goals:**
- One account row that opens a small, quiet menu.
- No change to how theme or sign-out work underneath.

**Non-Goals:**
- An account or profile page, avatars from images, or showing a display name.
- Moving Archive and Trash (the user chose to keep them visible).

## Decisions

### D1: A Base UI menu on the account row
The account row is the `DropdownMenuTrigger`. It is full-width and shows the avatar initial, the truncated email and a small `ChevronsUpDown` icon as the "opens a menu" cue. The menu opens upward (`side="top"`, `align="start"`), because the row sits at the bottom edge. It reuses the existing menu, so keyboard support, Escape and focus return come for free and match the row ⋯ menu.

- **Alternative: a popover with custom buttons.** It would need its own keyboard handling. Rejected.

### D2: Menu content
In order:
1. **Settings**: a menu item that navigates to `/settings` with the router. The shared menu wrapper has no link item, and one entry doesn't justify adding it.
2. A separator.
3. A `DropdownMenuLabel` "Theme" with a `DropdownMenuRadioGroup` of Light, Dark and System, each with its icon (Sun, Moon, Monitor, as in `ThemeToggle`). The group's value is the current theme only after mount, so the server render marks nothing.
4. A separator.
5. **Sign out**.

Choosing a theme keeps the menu open (`closeOnClick={false}` on the radio items), so the change is visible at once and the user can switch again. Settings and Sign out close it.

### D3: Sign out from a menu item
The menu popup unmounts when it closes, so the `<form action="/auth/sign-out" method="post">` lives in the sidebar footer outside the popup, hidden, with a ref. The Sign out item calls `form.requestSubmit()`. This keeps the existing POST route and its CSRF-safe method. It is not changed to a GET link.

### D4: Current-page highlight
`navLink` already applies `bg-sidebar-accent font-medium` when `pathname === href`. The account row applies the same classes when `pathname === "/settings"`, and the Settings item in the menu gets `aria-current="page"` then. The trigger itself doesn't take `aria-current`, because it is a button, not a link.

### D5: Sizes
The account row uses the same height as the nav rows (`h-7`, with `pointer-coarse:h-10` from phone-comfort's scale), so the footer reads as one list. The avatar stays at `size-6`.

## Risks / Trade-offs

- [Theme is one tap deeper] → It's rarely changed, and System is the default. Accepted by the user.
- [The account row's purpose may not be obvious] → The chevron cue, plus the row's `aria-label` "Account menu for <email>".
- [`closeOnClick` naming in this Base UI version] → Confirm the prop in the Base UI Menu docs before use (task 1.1).
