# Design

## Context

See proposal.md (Why). The interface uses Tailwind 4, where text sizes and spacing are in `rem` (spacing is `calc(var(--spacing) * n)` with `--spacing: 0.25rem`). Most UI text is `text-sm` (0.875rem = 14px) or `text-xs` (12px). The note editor sets its own sizes in `px` from editor settings (`--tb-p-size` and others in `globals.css`), so it doesn't follow `rem`. shell-hardening already added `pointer-coarse:` tweaks: rows `h-10`, ⋯ and chevron `size-8`, top bar and panel buttons `size-11`, and a 44px hit area on the round New button.

## Goals / Non-Goals

**Goals:**
- One rule that scales the whole interface on touch screens, so no screen is forgotten.
- Close the remaining gaps to 44px targets with a few class changes.

**Non-Goals:**
- Changing layouts or adding new phone-only screens.
- Changing note text sizes (they are the user's choice in settings).
- Phone-specific redesign of individual pages. If one still feels cramped after this change, that's a follow-up.

## Decisions

### D1: Scale the root font size on touch screens
`globals.css` sets `html { font-size: calc(100% * 8 / 7); }` inside `@media (pointer: coarse)`. With a 16px browser default, the root becomes about 18.3px. Then `text-sm` is 16px, `text-xs` is about 13.7px, `h-7` rows are 32px and `size-4` icons are about 18px. Everything in `rem` (text, spacing, radii, menus, dialogs, toasts) grows together and keeps its proportions.

- **Alternative: add `pointer-coarse:text-base` and similar to each component.** That's dozens of edits across about 36 files, easy to miss on new screens, and proportions drift. Rejected.
- **Alternative: a breakpoint (`max-width`) instead of `pointer: coarse`.** That would also enlarge a narrow desktop window and miss tablets. The pointer is what makes small targets hard. Rejected, and `pointer: coarse` matches the shell-hardening touch rules.
- **The factor 8/7** makes `text-sm` exactly 16px, the spec's floor. 112.5% would leave it at 15.75px.

### D2: The note editor keeps its px sizes
The editor's sizes are `px` from editor settings, so D1 doesn't touch them. That is intended: those sizes are what the user picked. The editor chrome around the note (toolbar, title) is in `rem` and scales.

### D3: Re-tune the shell-hardening touch classes for the new scale
After D1, `pointer-coarse:h-10` rows become about 46px, which is fine. `size-8` on ⋯ and the chevron becomes about 37px, which is short, so those become `pointer-coarse:size-10` (about 46px). `size-11` on the top bar and panel buttons becomes about 50px, so it goes back to `pointer-coarse:size-10`, which still clears 44px with a less bulky bar. The round New button's `after:-inset-2` hit area is in `rem` and grows with D1. The 8px gap (`gap-4`) grows too.

### D4: 44px for menu entries, list rows and buttons
- Dropdown menu entries and submenu triggers in `ui/dropdown-menu.tsx` get `pointer-coarse:min-h-11`.
- Contents-list rows and the Archive and Trash list rows get `pointer-coarse:min-h-11` where they fall short after D1.
- Page buttons (`Button` sizes `sm` and `default`, 28px and 32px, about 32px and 37px after D1) get `pointer-coarse:min-h-11` on those sizes in `ui/button.tsx`.

Elements already at 44px or more after D1 are left alone. A measuring script decides, not guesswork (see tasks).

### D5: Panel width in px
The panel uses `w-[min(85vw,360px)]` in place of `w-64 max-w-[85vw]`. This is in `px` so D1 doesn't inflate the 360px cap.

## Risks / Trade-offs

- [Touch laptops and tablets with a keyboard also get the larger sizes, when their main pointer is touch] → That's acceptable: iPad's own UI uses 17px text. Laptops with a trackpad report a fine pointer and stay unchanged.
- [Fixed-px pieces (tree indent 12px per level, the 3px current mark, the editor) don't scale, so proportions shift slightly] → They're small decorations. Deep trees gain room, if anything.
- [Text that fit at 14px may wrap or truncate more] → The wider panel (D5) offsets this in the sidebar. The page check in the tasks covers the rest at 360px and 412px.
- [Things measured in px in tests or verify scripts change on touch emulation] → Only the scratchpad scripts. Unit and integration tests don't measure layout.

## Migration Plan

CSS and classes only. Ship with a normal merge, and roll back by reverting the commit.
