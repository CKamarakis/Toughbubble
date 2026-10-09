# Proposal

## Why

Images in a note can only be seen at their in-note size, or opened in a new browser tab from the image menu. On a phone that means leaving the app to look at a screenshot or photo. A lightbox lets the user look at images full screen, and step through all of a note's images, without leaving the note.

## What Changes

- New lightbox: the image fills the screen on a dark backdrop, with its alt text as a caption, a Download button and a close button. It closes with the close button, Escape, or a tap on the backdrop.
- Ways to open it:
  - a small expand button in the image's corner (shown on hover or focus with a mouse, always shown on touch screens);
  - a double-click or double-tap on the image (a single tap still selects the image for editing, as today);
  - the image menu's "Open full size", which now opens the lightbox instead of a new tab.
- A note with several images: previous / next arrows, the ← → keys and a horizontal swipe go to the note's other images, in note order, with a counter such as "2 / 5".
- Zoom: a click or tap on the image switches between fit-to-screen and the image's actual size; on touch screens, pinch to zoom; when zoomed in, drag to look around.
- **Changed:** the image menu no longer opens a new tab ("Open full size" opens the lightbox).

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `note-attachments`: "Adjusting images" now views an image full screen instead of opening it in a new tab; a new requirement describes the lightbox (opening, moving between images, zoom, closing).

## Impact

- `src/components/notes/attachments/`: `image-view.tsx` (corner button, double-click / double-tap), `attachment-menu.tsx` ("Open full size" opens the lightbox; the new-tab code goes), a new lightbox component, and wiring in `note-editor.tsx`.
- A small pure helper module with unit tests (double-tap detection, swipe detection, zoom limits, the note's image list).
- Reuses the existing signed image links and Download; no data model, server or dependency changes.
- README notes for attachments.
