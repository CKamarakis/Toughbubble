---
name: ToughBubble
description: A calm personal workspace for notes and visual boards.
colors:
  highlighter-yellow: "#F7D000"
  marker-magenta: "#F700A8"
  marker-magenta-text: "#C4007F"
  ink-violet: "#9C00F7"
  ink-violet-dark: "#C07BFF"
  warm-50: "#FBFBF9"
  warm-100: "#F5F4F2"
  warm-200: "#EAE9E6"
  warm-300: "#D9D8D3"
  warm-400: "#B2B0A9"
  warm-500: "#8C897D"
  warm-600: "#6E6B5E"
  warm-700: "#514E43"
  warm-800: "#333129"
  warm-900: "#22211B"
  warm-950: "#141310"
  surface-raised: "#FFFFFF"
  success: "#0B7F3E"
  success-dark: "#3DD68C"
  error: "#D92D20"
  error-dark: "#FF6B5E"
  warning: "#A65A00"
  warning-dark: "#FFA23D"
typography:
  wordmark:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 300
  page-title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: "2rem"
  note-h1:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.25
  note-body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  ui:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1rem"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "14px"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  hairline: "1px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.highlighter-yellow}"
    textColor: "{colors.warm-950}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-outline:
    backgroundColor: "{colors.warm-50}"
    textColor: "{colors.warm-800}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-ghost:
    textColor: "{colors.warm-800}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  input:
    backgroundColor: "{colors.warm-50}"
    textColor: "{colors.warm-800}"
    rounded: "{rounded.lg}"
    padding: "4px 10px"
    height: "32px"
  sidebar-row:
    textColor: "{colors.warm-800}"
    typography: "{typography.ui}"
    rounded: "{rounded.md}"
    height: "28px"
  sidebar-row-current:
    backgroundColor: "{colors.warm-200}"
    textColor: "{colors.warm-800}"
    rounded: "{rounded.md}"
    height: "28px"
  toolbar-button:
    textColor: "{colors.warm-800}"
    rounded: "{rounded.md}"
    size: "32px"
---

# Design System: ToughBubble

## Overview

**Creative North Star: "The Quiet Studio"**

A calm room with bright tools. The walls are warm paper and soft graphite; the tools (a highlighter yellow, a marker magenta, an ink violet) sit on the desk and only come out when something needs attention. The room stays quiet so the user's own notes and boards are the loudest thing in it.

Density is moderate and desktop-first: a 256px sidebar tree on warm grey, a centred work column up to 896px wide, 14px interface text and 32px controls. Both themes are first-class. Dark mode is warm graphite, never black.

The chosen component feel is **tactile and playful**: controls should feel like things you can press and pick up. Today the components are close to the shadcn defaults (flat, tidy, a 1px press-down on buttons). That gap between the current look and the chosen feel is deliberate direction for future work, not a description of what ships now.

**Quiet first, with small moments of fun.** Motion and colour reward actions (create, drop, finish); surfaces and layout stay calm. Examples of the right amount: the yellow "+" squishes when pressed, a dragged item lifts and settles with a small bounce, a new item pops in once, empty states get one short friendly line. Too much: bouncing icons, confetti, colourful section backgrounds, emoji in the interface, jokes in the copy.

**The Small Reward Rule.** If it repeats, loops or decorates, it's too much. Fun happens once, at the moment the user did something.

**Key Characteristics:**
- Warm neutrals (hue 48) everywhere; no cold greys, no pure black.
- Three bright accents, each with one job, used sparingly.
- Flat surfaces at rest; shadows only on things that float.
- Rounded but not bubbly: a 10px base radius.
- Accessibility is built into the palette: AA body text, 3:1 for icons and field borders.

## Colors

Warm paper and graphite with three bright accents that each have one job.

### Primary
- **Highlighter Yellow**: primary buttons (CTAs), the default sticky note, selection and ticked checkboxes, with dark text (warm-950) on it. On dark surfaces it can also be text or an icon colour: dynamic and easy to spot.

### Secondary
- **Marker Magenta**: connectors, highlights, Storm selection, and the ToughBubble wordmark. As text on light backgrounds it darkens to **Marker Magenta Text**; in dark mode text uses #FF5CC8.

### Tertiary
- **Ink Violet**: links and focus rings in light mode. In dark mode it lightens to **Ink Violet Dark**. Info states use the same violet.

### Neutral
- **Warm 50** (page background, light): the paper.
- **Warm 100** (sidebar, light; also muted and secondary surfaces).
- **Warm 200** (borders and the current sidebar row, light).
- **Warm 500** (form field borders, light): chosen for 3:1 against the surface.
- **Warm 600** (secondary text, light).
- **Warm 800** (body text, light; page background, dark): the graphite.
- **Warm 900** (sidebar, dark).
- **Warm 700** (raised surfaces, menus and borders, dark).
- **Warm 950** (text on yellow; darkest surface when black would otherwise be used).
- **Surface Raised** (cards and popovers, light): plain white, one step above the paper.

### Status
Success, error and warning each have a light and dark value. Warning is amber, never the brand yellow.

### Project colors
Seven presets (yellow, magenta, purple, green, amber, blue, red) colour project icons in the sidebar. Each pair is tuned to 3:1 against its theme's sidebar; the light yellow is a dark ochre (#8A6D00) for that reason. They live in `src/lib/tree/style.ts` and `globals.css`.

### Named Rules
**The Yellow Is Paper Rule.** Highlighter Yellow is a background under dark text (CTAs, selection), or text and icons on dark surfaces, where it reads at about 8.7:1. Never yellow text or icons on a light surface (about 1.5:1).

**The One Job Rule.** Each accent has one job: yellow acts, magenta marks, violet links and focuses. Don't borrow an accent for another job because it looks nice.

**The Warm Graphite Rule.** Dark mode surfaces come from the warm scale (800, 900, 700). Pure #000 is never a surface.

## Typography

**Body Font:** Geist (with ui-sans-serif, system-ui)
**Mono Font:** Geist Mono (with ui-monospace)

**Character:** One neutral, modern sans for everything. Personality comes from weight and colour, as in the light-weight magenta wordmark, not from a second typeface.

### Hierarchy
- **Wordmark** (300): "ToughBubble" beside the logo. Light weight is the brand signature; it is never a heading.
- **Page title** (600, 24px, 32px line): item titles at the top of the main pane.
- **Note headings** (H1–H3 700, H4–H6 600; 36/30/24/20/18/16px; 1.25 line): defaults the user can change in Settings, per heading and per theme.
- **Note body** (400, 16px, 1.6 line): user-adjustable size and colour.
- **UI** (400, 14px): sidebar, menus, buttons, breadcrumbs. Medium (500) marks the current item and button labels.
- **Label** (500, 12px): menu group labels, save status, small metadata.
- **Mono** (14px): inline code and code blocks in notes.

### Named Rules
**The Writer Decides Rule.** Note text sizes and colours belong to the user's settings. Product UI never overrides them; it only supplies the defaults.

## Layout

- **Shell:** a fixed 256px sidebar on the left and the main pane on the right, each scrolling on its own. Below 768px the sidebar becomes an overlay drawer with a dim backdrop and a top bar to open it.
- **Main pane:** content is centred in a column up to 896px wide, with 24px side padding and 32px top padding. Sections stack with 24px gaps.
- **Sidebar:** 12px padding; the search field, tree, Archive/Trash links and the account area are separated by hairline borders. Tree rows are 28px tall and indent 12px per level, with 1px gaps between rows.
- **Rhythm:** a 4px base grid. 4, 8, 12, 24 and 32px are the working steps.
- **Note editor:** the formatting toolbar sticks to the top of the pane with a translucent background, and the text starts 20px below it.

## Elevation & Depth

Flat by default. Surfaces are separated by tone (paper, sidebar grey, white cards) and hairline borders, not by shadow. Shadows appear only on things that float above the page: menus and popovers (medium), and the mobile sidebar drawer (large). The note toolbar uses a background blur instead of a shadow.

### Named Rules
**The Only Floating Things Cast Shadows Rule.** If it doesn't float over other content, it has no shadow. Tone and borders do the layering.

## Shapes

Rounded, friendly corners from a 10px base: 10px on buttons and inputs, 8px on rows, menu items and toolbar buttons, 6px on small icon buttons, 14px on large containers such as the dashed empty-state box. Avatars and drop indicators are fully round. Borders are 1px hairlines in the theme's border colour; empty states use a dashed border.

## Components

### Buttons
Compact and confident: 32px tall, 10px corners, 14px medium labels, 16px icons.
- **Primary:** Highlighter Yellow with warm-950 text. Hover lightens it to 80% strength.
- **Outline:** paper background with a hairline border; hover fills with the muted grey.
- **Ghost:** no fill until hover.
- **Destructive:** a 10% tint of the error red with red text, never a solid red block.
- **Press:** every button nudges down 1px when pressed. This is the seed of the tactile feel.
- **Focus:** a 3px violet ring at half strength plus a violet border.

### Inputs / Fields
- **Style:** 32px tall, 10px corners, a warm-500 border (3:1), transparent on paper and a faint fill in dark mode.
- **Focus:** a violet border and a 3px half-strength violet ring.
- **Error:** a red border and a soft red ring.

### Navigation (sidebar)
- **Rows:** 28px, 8px corners, 14px text, 16px muted icons.
- **States:** hover fills warm-200 (warm-700 in dark); the current row keeps that fill and turns medium weight. Row actions appear on hover or focus.
- **Tree:** chevrons rotate 90° to show a row is open. While dragging, a 2px violet line shows where the item will land.
- **Header:** logo plus the magenta wordmark in light weight, as one link home.

### Menus and Popovers
White in light mode (warm-700 in dark), 8–10px corners and a medium shadow. Items are 8px-rounded rows that fill with the muted grey on focus. Menus open in 100ms.

### Note Toolbar (signature)
A sticky strip of 32px icon buttons and compact dropdowns (text style, alignment, font size) separated by hairline dividers. It sits on a translucent paper background with a blur. The save status sits at the far right in 12px muted text.

### Project Icon
Projects carry one of 16 icons in one of 7 preset colours, shown in the sidebar and the page title. This is the main place a user's own colour enters the interface.

## Do's and Don'ts

### Do:
- **Do** put dark text (warm-950) on Highlighter Yellow, always.
- **Do** use Marker Magenta Text (#C4007F) rather than raw magenta for text on light backgrounds.
- **Do** use Ink Violet for links and focus rings, switching to #C07BFF in dark mode.
- **Do** keep body text at 4.5:1 and icons and field borders at 3:1 in both themes.
- **Do** build dark surfaces from warm-800, warm-900 and warm-700.
- **Do** keep controls at 32px and sidebar rows at 28px for a consistent rhythm.

### Don't:
- **Don't** use Highlighter Yellow as text or as an icon colour on a light surface; on dark surfaces it's welcome.
- **Don't** use the brand yellow for warnings; warnings are amber (#A65A00 / #FFA23D).
- **Don't** use pure black (#000) for any surface.
- **Don't** put shadows on things that don't float.
- **Don't** override the user's note text sizes or colours from product UI.
