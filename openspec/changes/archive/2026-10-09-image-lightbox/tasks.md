# Tasks

## 1. Helpers

- [x] 1.1 Add `src/lib/notes/lightbox.ts` with `noteImagesIn(doc)` (D1), `isDoubleTap` (D3), `swipeDirection`, `clampScale`, `zoomAround` and `clampOffset` (D4, D5). Verify with unit tests that cover:
  - image order, and skipping file cards and images without an id;
  - double-tap timing and distance limits;
  - swipe thresholds and a vertical move not counting;
  - scale limits;
  - zoom keeping the pointed-at point fixed;
  - offset clamping at each edge.

## 2. The viewer

- [x] 2.1 Add `ImageLightbox` and the `useLightbox()` provider in `note-editor.tsx` per D1, D2 and D6. Verify in the browser:
  - It opens full screen on the right image, with Download, ✕ and the alt-text caption.
  - Escape, ✕ and a click on the dark area close it, and focus returns.
  - Tab stays inside it.
  - Both themes look right at desktop and at 390×844.
- [x] 2.2 Add moving between images per D5. Verify in the browser with a five-image note:
  - The counter reads "2 / 5" on the second image.
  - → and the next button go forward, and ← goes back.
  - The ends are disabled.
  - A one-image note shows no counter or arrows.
  - A swipe moves one step (emulated touch).
- [x] 2.3 Add zoom and pan per D4. Verify in the browser:
  - Clicking a 2560 px image on a 1280 px window shows it at actual size around the click point, and a second click fits it again.
  - A small image doesn't zoom.
  - Dragging while zoomed stops at the edges.
  - Changing images resets the zoom.

## 3. Ways to open it

- [x] 3.1 Add the corner button and the double-click / double-tap detector to `ImageView` per D3. Verify in the browser:
  - With a mouse, the button shows on hover and on focus only.
  - In touch emulation, it is always visible and at least 44px.
  - A single click selects the image (menu and handles) without opening the viewer, and a double-click opens it.
  - Resizing by a handle still works and doesn't open it.
  - No button shows while the image is uploading.
- [x] 3.2 Make the image menu's "Open full size" open the viewer, and remove the new-tab code per D3. Verify in the browser that it opens the viewer and that no new tab opens.

## 4. Follow-ups from the phone check

- [x] 4.1 Make the in-note resize handles work with a finger: `touch-none`, a 44px target on touch screens, and `pointercancel` ending the resize. Verify in touch emulation that dragging the right handle 140 px left narrows the image, the page does not scroll, and Undo restores it.
- [x] 4.2 Make ← → work wherever focus is in the viewer (window listener, capture phase). Verify in the browser that the keys work after clicking the next button and after clicking the image.
- [x] 4.3 Put the ‹ › buttons next to the fitted image on desktop. Verify that they are 12px from a 1200 px image and stay on screen for a full-width image.
- [x] 4.4 Light backdrop in the light theme. Verify by screenshot at desktop and phone in both themes.
- [x] 4.5 Keep the phone keyboard closed while an image or file card is selected (`inputmode="none"` on the editor during a node selection of one). Verify in touch emulation that tapping an image sets it, a cursor in text clears it, and Delete and Undo still work on the selected image.

## 5. Docs and release

- [x] 5.1 Update the README's attachments notes (viewer, ways to open it, gestures). Verify that they match the code.
- [x] 5.2 Run types, lint, unit and integration tests. Verify that all pass.
- [x] 5.3 Push the branch. After the user approves, merge to `main`. Ask the user to check on a phone: double-tap, swipe, pinch and drag, and closing.
