---
title: "Storms spike 5: palette, fonts and shortcuts"
date: 2026-10-10
tags:
  - storms
  - spike
  - palette
  - fonts
  - shortcuts
source: text
---

Spike 5 for Storms v1: a proposed palette, fonts and keyboard shortcuts. The final palette and fonts are picked in a design pass (`/impeccable`); the shortcuts are a draft for the user to skim.

## Palette (proposal)

Derived in OKLCH around the brand hues (Highlighter Yellow ~98°, Marker Magenta ~350°, Ink Violet ~305°; `DESIGN.md`). **Tints** are for sticky notes and fills with dark text (`#141310`); **strong** tones are for borders, arrows, text and dark fills with white text. Contrast is the WCAG ratio (4.5 = AA for body text).

| Colour | Tint | Ink on tint | Strong | White on strong |
|---|---|---|---|---|
| Yellow | `#fde988` | 15.2 | `#958000` | 3.9 (use dark text) |
| Orange | `#ffdeb9` | 14.5 | `#a84a00` | 5.8 |
| Red | `#ffd7cf` | 14.0 | `#b33832` | 6.0 |
| Pink | `#ffd5ee` | 14.2 | `#a83876` | 6.0 |
| Purple | `#f3ddff` | 14.7 | `#7f4bb1` | 5.9 |
| Light blue | `#bbf0ff` | 15.1 | `#0073b6` | 5.1 |
| Dark blue | `#cfe9ff` | 14.8 | `#3263c3` | 5.7 |
| Light green | `#d4f3c4` | 15.4 | `#3b7b00` | 5.2 |
| Dark green | `#c6f6d1` | 15.5 | `#008135` | 5.0 |
| Brown | `#e7cbb9` | 12.1 | `#734a2e` | 7.6 |
| Grey | `#eae9e6` | 15.3 | `#6e6b5e` | 5.3 |
| Black / white | `#ffffff` | 18.6 | `#141310` | 18.6 |

- All tints pass AA (and AAA) with dark text. Strong yellow needs dark text.
- Light blue and dark blue tints look alike as sticky colours; the design pass should separate them more, or show "dark blue" only as a strong tone.
- The existing note colour picker (`src/lib/color-presets.ts`, 9 presets) uses the strong brand colours; the storm picker adds the tint row.
- Open: do sticky colours change in dark mode? (Suggest: no; the board keeps its colours, and only the canvas background darkens.)

## Fonts (proposal, 10)

- App fonts: **Geist**, **Geist Mono** (already loaded through `next/font` in `src/app/layout.tsx`).
- Added, free on Google Fonts: **Inter**, **Roboto**, **Open Sans**, **Lato**, **Montserrat**, **Merriweather** (serif), **Playfair Display** (display serif), **Caveat** (handwriting).
- Self-host them through `next/font`, so no requests go to Google at runtime.
- Canvas rule: a font must be loaded before text is drawn or measured (`document.fonts.load`), otherwise auto-fit measures the wrong font. Load only the fonts a board actually uses.
- Weights: regular, bold, italic, bold italic per family. Each file is roughly 15–40 KB (estimate, not measured).

## Keyboard shortcuts (draft)

| Action | Keys |
|---|---|
| Select / hand (pan) tool | V / H |
| Sticky note / shape / text / frame / connector | N / S / T / F / L |
| Rectangle / oval (in the shape tool) | R / O |
| Pan | Space + drag, right-drag |
| Zoom in / out / fit all / 100% | Ctrl + = / Ctrl + − / Shift + 1 / Shift + 0 |
| Undo / redo | Ctrl + Z / Ctrl + Shift + Z (and Ctrl + Y) |
| Copy / paste / duplicate | Ctrl + C / Ctrl + V / Ctrl + D |
| Delete | Delete, Backspace |
| Select all | Ctrl + A |
| Group / ungroup | Ctrl + G / Ctrl + Shift + G |
| Lock / unlock | Ctrl + Shift + L |
| Bring to front / forward / backward / to back | PgUp / Shift + PgUp / Shift + PgDn / PgDn |
| Copy style / paste style | Ctrl + Alt + C / Ctrl + Alt + V |
| Move 1 px / 10 px | Arrows / Shift + arrows |
| Snapping off while dragging | Hold Alt |
| Edit text of the selected item | Enter (Esc to leave) |

- Cmd replaces Ctrl on Mac.
- The layer, lock and style shortcuts follow Miro's right-click menu (from the user's screenshot); the tool letters follow common board tools and should be checked against Miro.
