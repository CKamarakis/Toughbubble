# Tasks

## 1. Measure first

- [x] 1.1 Write a Playwright measuring script (scratchpad, test user, Chrome) that, in touch emulation at 390×844 and 412×915, lists every visible interactive element and text run that falls below the spec (text under 16px for regular text or 13px for secondary text, targets under 44px tall) on: the sidebar panel, Home, a project page with its contents list, a note page, Archive, Trash, Settings, an open "⋯" menu with a submenu, and the Move to… dialog. It also records the same sizes at 1440×900 with a mouse as the desktop baseline. Verify that it runs and prints a baseline report.

## 2. Scale on touch screens

- [x] 2.1 Add the touch-screen root scale to `globals.css` per D1, after checking how Tailwind 4 resolves `rem` (`--spacing`, `--text-*`) in the docs. Verify with the script that regular text is 16px on touch, and that the desktop numbers match the baseline exactly.
- [x] 2.2 Confirm the note editor keeps its px sizes per D2. Verify that a note's paragraph is 16px on touch with the default editor settings, and that the Settings preview still matches its chosen sizes.

## 3. Close the gaps

- [x] 3.1 Re-tune the shell-hardening touch classes per D3 (⋯ and chevron to `size-10`, top bar and panel buttons to `size-10`). Verify with the script that each is at least 44px, and that the New and close hit areas stay at least 8px apart.
- [x] 3.2 Give menu entries, list rows and buttons 44px on touch per D4, only where the script still reports a shortfall. Verify that the script reports no target under 44px on the pages from 1.1, and that the desktop numbers match the baseline.
- [x] 3.3 Make the small-screen panel `min(85vw, 360px)` wide per D5. Verify that it is about 350px at 412px wide and 360px at 700px wide, and that tapping the visible strip closes it.

## 4. Check and document

- [x] 4.1 Screenshot every page from 1.1 at 390×844 (touch, light and dark) and look for wrapping, clipping or overlapping that the larger sizes caused. Fix anything found. Verify that a second screenshot pass is clean.
- [x] 4.2 Add a "Phone sizes" line to the README's shell notes (the root scale on `pointer: coarse`, editor excluded, panel width). Verify that it matches the shipped CSS.
- [x] 4.3 Run types, lint, unit and integration tests. Verify that all pass.
- [x] 4.4 Push the branch. After the user approves, merge to `main` and ask the user to check on their phone: sidebar readability, a project page, the ⋯ menu, and a note.
