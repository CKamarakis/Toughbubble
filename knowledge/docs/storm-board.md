## How it works, roughly
The whole board is drawn as one picture (a canvas) by our own engine, not as page elements, so it stays smooth with 1,000 stickies; an automatic speed test checks this. Sticky text is not drawn when zoomed out below 30%. Only the sticky being typed in becomes a real text box. The board's code is downloaded only when a Storm is opened.

## Why

- **Zoom**: the mouse wheel zooms (as the PRD asks), but browsers report a mouse wheel and a trackpad scroll as the same kind of event, so the board guesses from the event's shape. Some smooth-scrolling mice may pan instead of zoom; Ctrl + wheel always zooms.
- **Select and move stickies**: left-dragging on empty board does nothing yet because the selection box arrives with multi-select in a later slice (storms-arrange).
- **Type in a sticky**: the fitted text size is saved with each sticky because fitting every sticky when a board opens measured too slow; fitting while typing is fast. 8 px keeps a full 500-character sticky mostly readable at 100%, and 64 px matches Miro's large short text. 500 characters because a sticky never needs more (lowered from 5,000 after the test round). [[storms-draw-on-one-canvas-with-our-own-engine]]
- **Sticky colour on creation**: the colour for new stickies is remembered per user in this browser only, not across devices, because Storms have no server-side settings yet.
- **Sticky toolbar**: hidden while typing or dragging, unlike Miro, because on small stickies it would cover the top lines of the text being edited.
- **Copy, paste and duplicate**: uses the browser's own copy and paste events, so there is no permission prompt and copies work across Storms and tabs. Safari may drop the sticky's colour and size and paste plain text instead (not yet checked). Ctrl + D with nothing selected still opens the browser's bookmark dialog: the board can't claim the shortcut when there is nothing to duplicate.
