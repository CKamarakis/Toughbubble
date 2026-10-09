# Tasks

## 1. Undo for Archive and Trash

- [x] 1.1 Add the pure helper `undoReturnTarget(rows, removedId, currentId)` per D1 (returns the open item's id when it is the removed item or inside it, else null); verify unit tests cover: open item removed, open item inside the removed subtree, unrelated open item, no open item
- [x] 1.2 Give the archive and trash confirmations an Undo action per D1 (6 s toast, `used` guard, `restoreItem` in a transition, navigate to `returnTo` after a successful restore); verify types and lint pass, and in the browser: archive a project with children then Undo restores it in place; trash a note from its page then Undo reopens it; a fast double click on Undo shows no error toast

## 2. Small-screen sidebar panel

- [x] 2.1 Add the pure helper `topBarTitle(pathname, rows)` per D2; verify unit tests cover an item route (display title, including an untitled item), `/`, `/archive`, `/trash`, `/settings`, and an unknown item id
- [x] 2.2 Replace the hand-built small-screen `aside` and backdrop in `workspace-shell.tsx` with the Base UI `Dialog` side panel per D2 (`aria-label="Sidebar"`, close button, closes on navigation, closes when the window reaches 768px), and show `topBarTitle` in the top bar; verify in the browser at 390×844: Escape closes and focus returns to the open button, Tab stays inside the panel, the close button and an outside tap close it, opening a note closes it, the top bar shows the note title; at 1440×900 the sidebar is unchanged with no top bar

## 3. Touch-friendly rows

- [x] 3.1 Add the pure `createLongPress` state machine per D3 (500 ms, 8 px tolerance, cancel on up/cancel/move, swallow the following click after firing); verify unit tests with fake timers cover fire, cancel by early release, cancel by movement, and the swallowed click
- [x] 3.2 Make `ItemMenu` controllable (`open` / `onOpenChange`) and wire the long press on sidebar rows to open it; add `pointer-coarse:` row height (h-10), always-visible ⋯ and no touch callout/selection per D3, after confirming the variant in the Tailwind 4 docs; verify types and lint pass and, in touch emulation (`playwright-cli` mobile device): ⋯ visible on every row, rows ≥ 40px, a long press opens the row's menu without opening the item, mouse view keeps h-7 rows with hover reveal
- [x] 3.3 Switch `tree-dnd.tsx` to `MouseSensor` (distance 6) plus a pen-only `PointerSensor` per D3; verify with a mouse that dragging a note within its group still reorders (existing drag checks) and, in touch emulation, that a swipe on the list scrolls without moving an item

## 4. Current marker, controls and dates

- [x] 4.1 Add the magenta current-row mark per D4 (3×16 px, rounded, grows in once over 150 ms, none under reduced motion); verify in the browser in both themes that only the open item's row has the mark while another row is hovered
- [x] 4.2 Restyle the theme control track and selected option, and the avatar, per D5; verify with the contrast measurement used in the critique that the track edge and the avatar reach ≥ 3:1 against the sidebar in light and dark
- [x] 4.3 Confirm the cause of the date-format mismatch (server vs browser locale), then make `FormatDate` render after mount per D6, or fix the actual cause if it differs; verify on a fresh page load with an en-GB browser locale that the contents table and the Trash view both show "8 Oct 2026"-style dates, with no layout shift in the contents table
- [x] 4.4 Give `create` its own transition and point the New buttons at it per D7; verify in the browser that the sidebar New menu opens while an archive is saving, and that a double click on a New option creates one item

## 5. Row menu layout

- [x] 5.1 Restructure `ItemMenu` per D8: a "New inside" submenu (Note, Storm, Folder, Project) for containers and a "Reorder" submenu (Move up/down with today's disabled rules); keep Rename, Move to…, Convert, Archive and Move to Trash at the top; verify in the browser that a folder's menu has 7 top-level entries and a note's has 5, that the right arrow key opens a submenu with focus on its first available entry, and that New inside > Note and Reorder > Move up still work from both the sidebar and the page menu

## 6. Re-critique follow-ups

- [x] 6.1 Use one New order (Note, Storm, Folder, Project) in the sidebar New menu, the row menu's New inside and the page's New inside, from one shared constant; verify all three menus list that order
- [x] 6.2 On touch screens make the top bar's open button and the panel's New and close buttons 44px square with 8px between them; verify in touch emulation at 390×844 by measuring them, and that desktop sizes are unchanged
- [x] 6.3 Name the item in the archive and trash confirmations ('"Budget" moved to Archive', long titles shortened); verify in the browser
- [x] 6.4 Drop the tree / treeitem / group roles and aria-selected from the sidebar list (plain list; the chevron and link keep their labels and aria-current), since arrow-key tree navigation is not offered; verify lint, types and the existing tests pass

## 7. Verification and release

- [x] 7.1 Run lint, unit and integration tests; verify they all pass
- [x] 7.2 Run `/impeccable critique` on the app shell + sidebar again with the test user, at desktop and mobile in both themes; verify the two P1 issues and the current-row, light-control and menu issues from the 2026-10-08 critique no longer appear, and record the new score
- [x] 7.3 Update the README notes for the shell (Undo, small-screen panel, touch long press, no touch drag); verify the README describes the shipped behavior
- [x] 7.4 Push the branch and check the preview deployment on a real phone if available (long press, panel, swipe scroll); after the user approves, merge to `main` and verify on production that archive Undo works
