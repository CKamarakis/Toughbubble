# Design

## Context

- Images are a Tiptap NodeView (`ImageView` in `src/components/notes/attachments/image-view.tsx`). The `<img>` uses the signed link from `useAttachmentStore()` (`status(...).url`, refreshed on error). Stored images are at most 2560 px on the longer side, so the stored file is the full size.
- A single click selects the image (ProseMirror node selection). That shows the resize handles and the image menu (`attachment-menu.tsx`, a BubbleMenu). The menu's "Open full size" opens the signed link in a new tab (`openFull`).
- The editor is always editable. The app has a Base UI dialog wrapper (`ui/dialog.tsx`) and `pointer-coarse:` styling for touch screens.
- See proposal.md for the why, and the delta spec for the behaviour.

## Goals / Non-Goals

**Goals:**
- One viewer component, opened from three places, with the note's images in note order.
- Touch first: double-tap, swipe, pinch and drag work on a phone without fighting the page's scroll or zoom.
- Pure logic (gestures, zoom limits, image list) in a tested helper module.

**Non-Goals:**
- Viewing images from other notes, or file cards (PDF etc.).
- Editing in the viewer (alt text, rotate, crop).
- Mouse-wheel or trackpad zoom, and zoom levels other than fitted, actual size and pinch.
- Wrapping from the last image to the first.

## Decisions

### D1. The viewer lives at the editor level, opened through a small context
- `note-editor.tsx` renders one `ImageLightbox` and provides `useLightbox()`: `open(attachmentId)`.
- `ImageView` (corner button, double-tap) and `AttachmentMenu` ("Open full size") call it.
- On open, the viewer reads the note's images from `editor.state.doc` in document order (`noteImagesIn(doc)`: attachment id, alt), keeping only images whose status is ready. It starts on the requested one.
- Why not one viewer per NodeView: the viewer needs the whole note's image list, and a single instance avoids one dialog per image.
- The list is taken when the viewer opens; edits made while it is open are not tracked. That is fine, since the viewer covers the note.

### D2. Base UI Dialog, styled as a full-screen viewer
- `Dialog.Root` / `Portal` / `Backdrop` / `Popup` from `@base-ui/react/dialog` directly, not `DialogContent`, which is a centred card. This gives focus trap, Escape, an inert page and focus return.
- The Popup is a full-screen layout:
  - top bar: counter left; Download and ✕ right;
  - the image area in the middle;
  - ‹ › buttons on the sides;
  - the alt-text caption at the bottom.
- The Popup is its own backdrop (the Base UI Backdrop did not show under the full-screen Popup): `warm-50/95` with dark text in the light theme, `warm-950/95` with light text in the dark theme, with a blur so the note does not show through. Buttons are 40px (44px with `pointer-coarse:`).
- The ‹ › buttons sit 12px outside the fitted image (`max(0.5rem, calc(50% - fittedWidth/2 - 3.25rem))`), so they stay next to small images and at the edge for wide ones.
- Closing on the backdrop: a click on the image area outside the `<img>` closes it. This is checked on the event target, because the Popup covers the backdrop.
- Accessible name: "Image viewer". The `<img>` keeps its alt text. The counter's label reads "Image 2 of 5".

### D3. Opening from the image
- **Corner button:** a ⤢ (`Maximize2`) button at the top right of the figure.
  - With a mouse: `opacity-0`, shown by `group-hover` / `group-focus-within`.
  - On touch screens: always shown, as a 44px target with a smaller visible circle.
  - Only when the status is ready.
  - `onMouseDown` uses `preventDefault` and `stopPropagation`, so clicking it doesn't move the editor selection.
- **Double-click / double-tap:** one pointer-based detector on the `<img>` (`isDoubleTap(prev, next)`: two `pointerup`s within 350 ms and 12 px).
  - It is used for mouse and touch alike, so desktop double-click and mobile double-tap behave the same, and a browser that also fires `dblclick` can't open it twice.
  - The first tap still selects the image as today.
- **Image menu:** "Open full size" calls `open(id)`. `openFull` and its new-tab code are removed. The icon becomes `Maximize2`.

### D4. Zoom and pan as one transform
- State: `scale` (1 = fitted) and `offset {x, y}`. Applied as `transform: translate(...) scale(...)` on the fitted `<img>`.
- **Click or tap:** toggles between 1 and `actual = naturalWidth / fittedWidth`, keeping the clicked point under the pointer. If `actual <= 1`, nothing happens.
  - A tap is a pointerup with less than 12 px of movement.
- **Pinch:** two active pointers. Scale by the change in their distance, around their midpoint, clamped to `[1, max(4, actual)]`.
- **Drag:** one pointer while `scale > 1` moves the offset. The offset is clamped so the image edges don't come inside the viewport (`clampOffset`).
- The image area has `touch-action: none`, so the browser doesn't page-zoom or scroll while we handle gestures.
- When the scale returns to 1 the offset resets, and changing images resets both.
- Why not native page pinch-zoom: it zooms the whole page and leaves it zoomed after closing.
- Why not a library: three gestures with clear math, and no new dependency.

### D5. Moving between images
- ‹ › buttons, ← → keys (a window `keydown` listener in the capture phase while the viewer is open, since the dialog stops key events from bubbling, and focus can be anywhere in it) and a swipe all move one step. They are disabled or ignored at the ends.
- **Swipe:** one pointer at `scale === 1`, a horizontal move of at least 50 px that is larger than the vertical move (`swipeDirection(dx, dy)`). Swipe left goes to the next image.
- With one image, the counter and ‹ › are not rendered.

### D6. Image source in the viewer
- Uses the same store status URL as the note, so it is already loaded and cached.
- `onError` calls `store.refresh(id)`, as `ImageView` does.
- Download uses the existing `downloadAttachment(id)`.

## Risks / Trade-offs

- **[A double-click near the resize handles starts a resize]** → The handles stop propagation on pointerdown, so the detector never sees those pointers.
- **[Dragging an image to move it in the note]** → Tiptap's node drag starts from `dragstart`, not from two quick pointerups, so a drag never counts as a double-tap.
- **[Pinch can't be checked in Playwright]** → The zoom and clamp math is unit-tested. Pinch and swipe are confirmed by the user on a real phone after the push.
- **[`touch-action: none` blocks the page zoom inside the viewer]** → Intended. Pinch zoom is provided by the viewer itself.
- **[The image list doesn't follow edits made while open]** → The viewer covers the note, so edits can't happen through the UI while it is open.
