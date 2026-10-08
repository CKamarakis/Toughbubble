# Design

## Context

See proposal.md (Why) and the specs for the required behavior. The facts from the code that shape the approach:

- `workspace-context.tsx` runs every tree change through `mutate()`: an optimistic change, then the server action, then `after()` on success. Archive and trash call `toast.success(...)` inside `after()`, so the confirmation already appears only once the save succeeded. `leaveIfRemoved()` sends the user home first if the open item is inside what is being removed.
- `restoreItem` (server action and `ops.restoreItem`) already restores a subtree to its original place and order. That is covered by `tests/integration/tree-operations.test.ts` ("restores the subtree to its original place").
- `pending` comes from the single `useTransition` shared by every tree change. The New buttons use `disabled={ws.pending}`, so any rename, move or archive disables them.
- `workspace-shell.tsx` builds the small-screen sidebar by hand: an `aside` toggled between `hidden` and `block`, plus a clickable backdrop. There's no dialog semantics, no focus handling and no Escape. It closes on navigation because the open state is keyed to the pathname.
- `tree-dnd.tsx` uses one `PointerSensor` (6px distance) for every input type, so a touch swipe that moves 6px can start a drag.
- The UI kit already has Base UI `Dialog` and `DropdownMenuSub` / `SubTrigger` / `SubContent` (`src/components/ui/dialog.tsx`, `dropdown-menu.tsx`).
- `FormatDate` uses `Intl.DateTimeFormat(undefined, { dateStyle: "medium" })` with `suppressHydrationWarning`. Likely cause of the "8 Oct 2026" vs "Oct 8, 2026" mismatch, still to confirm during implementation: server-rendered dates use the server's locale, and React keeps that text on hydration, while dates rendered later on the client use the browser's locale.
- Unit tests run in Node (`src/**/*.test.ts`) and there are no component tests. The integration tests hit the dev database.

## Goals / Non-Goals

**Goals:**
- Fix the critique's priority issues 1–4 with the smallest change to the shell's structure.
- Put the fragile logic (long press, Undo target, top-bar title) in pure functions that can be unit-tested in Node.

**Non-Goals:**
- Keyboard arrow navigation and a roving tabindex in the tree (the critique noted it; it gets its own change).
- A different mobile layout (bottom bar, full-height lists).
- Restyling the shell beyond what the specs name; the playful pass is `playful-home`.

## Decisions

### D1. Undo restores after the fact; no delayed delete
The toast shown in `after()` gets an Undo action (sonner `action`) and stays for 6 seconds. Undo calls the existing `restoreItem` action inside a transition, then refreshes. Because the toast only appears after a successful save, Undo can't race the archive or trash.
- **Once only:** sonner closes a toast when its action is clicked, and a local `used` flag in the closure ignores a second click that lands before the close.
- **Back to the page:** archive and trash capture `returnTo`, which is the open item's id when `leaveIfRemoved` would send the user away, otherwise null. After a successful restore, Undo pushes `/items/<returnTo>`. A pure helper `undoReturnTarget(rows, removedId, currentId)` decides this and is unit-tested.
- **Alternative rejected:** hide the item and delay the real archive until the toast expires ("soft undo"). Closing the tab during the delay would silently lose the user's action, and two code paths would disagree about the item's status.

### D2. Small-screen sidebar is a Base UI Dialog
Below `md`, the shell renders the sidebar inside the project's `Dialog`, styled as a left-side panel: full height, 256px wide, warm-graphite backdrop. Base UI provides the focus trap, makes the page behind inert, handles Escape and outside clicks, and returns focus to the trigger. The popup gets `aria-label="Sidebar"` and a close button in its top-right corner.
- At `md` and up, the existing static `aside` renders as today (`hidden md:block`). A `matchMedia("(min-width: 768px)")` listener closes the dialog if the window grows while it's open, so the sidebar is never shown twice.
- The existing "close on navigation" behavior (open state keyed to the pathname) stays.
- **Top-bar title:** a pure helper `topBarTitle(pathname, rows)` returns the open item's display title, or Home, Archive, Trash or Settings for those routes. It is unit-tested.
- **Alternative rejected:** a hand-rolled focus trap plus `inert` on the `aside`. More code, and easy to get subtly wrong. The project already ships the dialog primitive.

### D3. Touch: compact rows stay for mouse; no drag for touch
- **Row size and actions:** Tailwind 4's `pointer-coarse:` variant raises rows to `h-10` and sets the ⋯ button to `opacity-100` on touch screens. Hover-capable devices keep `h-7` and hover reveal. The project's Tailwind is 4.x; confirm the variant name against its docs before use.
- **Drag sensors:** replace the single `PointerSensor` with `MouseSensor` (distance 6) plus a `PointerSensor` limited to pen input. Touch never starts a drag, so swipes always scroll. This removes the long-press vs drag conflict instead of tuning delays.
- **Long press:** a small hook on the row listens to `pointerdown` with `pointerType === "touch"`, starts a 500ms timer, and cancels it on `pointerup`, `pointercancel` or movement beyond 8px. When the timer fires, it opens that row's `ItemMenu` (now controllable through `open` / `onOpenChange` props) and swallows the click that follows, so the item doesn't open. Rows get `-webkit-touch-callout: none` and `select-none` on touch to stop the browser's own long-press menu. The timer and threshold logic live in a pure `createLongPress` state machine, unit-tested with fake timers.
- **Alternative rejected:** `TouchSensor` with a hold delay for drag, plus a longer hold for the menu. Two time thresholds on one gesture are hard to discover and flaky across devices.

### D4. Current marker is a magenta bookmark
The current row gets an absolutely positioned 3×16px bar in `--highlight` (Marker Magenta) at its left edge, vertically centered, with fully rounded ends. It keeps today's fill and medium weight. This follows DESIGN.md's One Job rule (magenta marks).
- The optional yellow icon tint in dark mode from the proposal is **not** used. Yellow's job is acting, so the mark alone carries "you are here".
- Small moment of fun, per DESIGN.md: the bar grows in from 0 to 16px over 150ms when the row becomes current. It plays once and is disabled under `prefers-reduced-motion`.

### D5. Light-mode controls get edges, not just fills
A light fill can't reach 3:1 against the `#F5F4F2` sidebar (warm-200 is about 1.1:1). So:
- **Theme control:** the track gets a 1px `--input` border (warm-500, about 3.3:1 on the sidebar, the same reason that colour is the field border) over a warm-200 fill. The selected option is the `--background` paper with the same border.
- **Avatar:** warm-700 circle with warm-50 initial in light mode (about 7.7:1 against the sidebar). Warm-300 circle with warm-950 initial in dark mode (about 11:1 against warm-900). It's a solid, tactile chip in both themes.
- Contrast values are checked with the same measurement as the critique during verification.

### D6. Dates render in the browser's format after mount
`FormatDate` renders an empty `<time dateTime=…>` with a reserved minimum width on the server and during hydration, then the formatted date once mounted (`useSyncExternalStore`, the pattern `ThemeToggle` already uses). Every date then uses the browser's locale and time zone.
- **Alternative rejected:** format on the server from the `Accept-Language` header. It doesn't know the time zone and still disagrees with client-rendered dates.
- First, confirm the root cause. If the mismatch has another source, fix that instead; the spec, one format, still holds.

### D7. New has its own pending state
`create` gets its own `useTransition`, exposed as `creating`. The New buttons use `disabled={ws.creating}`, which still blocks double-creates. `pending` stays for everything else.

### D8. Menu layout uses the existing submenu parts
`ItemMenu` uses `DropdownMenuSub` for "New inside" (Note, Storm, Folder, Project, in today's `CREATE_ORDER`) and for "Reorder" (Move up, Move down, with the same disabled rules as today). Base UI submenus open with the right arrow key, hover or tap. The page-level menu in `item-view.tsx` uses the same component, so it changes too.

## Risks / Trade-offs

- [Touch users lose drag to reorder] → It barely worked before: swipes fought the 6px pointer drag. Reorder and Move to… in the menu cover the same changes, and the spec states it.
- [Long press on iOS also triggers text selection or the callout] → `touch-callout: none` and `select-none` on rows for coarse pointers. Verify in WebKit emulation with `playwright-cli`, plus a real phone if available.
- [Dialog and static aside both mount the sidebar tree] → They are never visible together (D2's media listener). Expansion state is shared through context, so both show the same tree. Drag context is only needed in one of them at a time.
- [Dates appear a frame after paint] → A reserved minimum width avoids layout shift. The dates are secondary, muted text.
- [Undo after the user navigates elsewhere] → Undo still restores. It only navigates when `returnTo` is set, which means the archive sent them away.
- [Second Undo click] → Guarded by the `used` flag and the toast closing, so `restoreItem` is called once. A second call would fail: `restoreItem` on an already active item returns the "not found" error (`actions.ts` `run()`), which would show an error toast.

## Migration Plan

UI-only and no data changes. Ship as one deploy; roll back with `git revert`.

## Open Questions

- Do the long-press timing (500ms) and movement tolerance (8px) feel right on a real phone? They can be tuned during verification without changing the specs.
