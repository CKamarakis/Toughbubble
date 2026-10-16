# Storms sticky style: testing plan

You are checking three additions to Storms: sticky text that **resizes itself to fit** (from big to small), **12 sticky colours**, and a **small toolbar above the selected sticky** where you pick the colour. It should stay quick and never lose your work.

- **Time:** about 25 minutes. Sections 1 and 2 (the main things) take about 15.
- **You need:** the app open and signed in (the deployed site or `http://localhost:3001`), a mouse and, if you have one, a laptop trackpad. Firefox is optional (step 22).
- **How to use it:** do each step, look at what happens, tick **Pass** or **Fail**, and write anything odd under Notes. A failed step is useful, not a problem.
- **"Browser check: Not yet"** means nobody has looked at the step in a browser yet. Start there.
- **"Also checked automatically by"** names the automated test that covers the same thing. "Browser only" means no test can check it, so your eyes are the only check.
- The small italic line under each title names the requirement and scenario it covers (from `specs/storm-board` and `specs/storm-saving` in this change), so we can check nothing is missed.
- Steps 20 to 23 are extra checks that only a real browser can do. They were flagged during code review.

Tip: make a new Storm just for this test (New > Storm), and call it "Test". Anything you do in it can be thrown away. "Board px" means the size on the board at 100% zoom.

---

## 1. Text that fits the sticky

**1. Type** _(storm-board, Type in a sticky: Type)_
- **Do:** Place a sticky (press `N`, click the board). Double-click it, type "Ideas", and press Esc.
- **You should see:** The sticky shows "Ideas" centred.
- Also checked automatically by: `src/components/storms/sticky-text-overlay.dom.test.ts` (shows a focused textarea; Esc finishes with one undo step).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**2. Short text is large** _(storm-board, Type in a sticky: Short text is large)_
- **Do:** In a new empty sticky, type "Hi".
- **You should see:** Very big letters, filling much of the sticky (the largest size, 64 px).
- Also checked automatically by: `src/lib/storms/text-layout.test.ts` ("Hi" in a 200×200 sticky gives 64); `src/components/storms/engine/renderer.test.ts` (draws at its fitted size).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**3. Long text gets smaller** _(storm-board, Type in a sticky: Long text gets smaller)_
- **Do:** Keep typing words into the same sticky, slowly, and watch the letters.
- **You should see:** The letters shrink a little at a time as the text grows, never in big jumps, and the text always stays inside the sticky. The text in the editor is the same size as it will be after you finish.
- Also checked automatically by: `src/lib/storms/text-layout.test.ts` (growing text shrinks, each size fits); `src/components/storms/sticky-text-overlay.dom.test.ts` (the editor's size equals the fitted size after each keystroke).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**4. Overflow is clipped** _(storm-board, Type in a sticky: Overflow is clipped)_
- **Do:** Paste or type a very long text (about 400 to 500 characters; any long paragraph repeated will do) into a sticky. Press Esc. Then double-click the sticky again.
- **You should see:** After Esc the text is very small (8 px) and what doesn't fit is cut off at the sticky's edge. When you edit again, all of the text is there.
- Also checked automatically by: `src/lib/storms/text-layout.test.ts` (500 characters stay at least 8 and are clipped only at 8); `src/components/storms/sticky-text-overlay.dom.test.ts` (long pasted text is all in the editor).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**5. Paste over the limit** _(storm-board, Type in a sticky: Paste over the limit)_
- **Do:** Copy about 800 characters of text and paste it into a sticky being edited. Press Esc, then edit it again and look at the end of the text.
- **You should see:** Only the first 500 characters were kept.
- Also checked automatically by: `src/components/storms/sticky-text-overlay.dom.test.ts` (a paste of 800 characters keeps the first 500).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**6. No jump** _(storm-board, Type in a sticky: No jump)_
- **Do:** Type a few lines of text in a sticky and press Esc. Look closely at where each line sits. Double-click to edit again, then press Esc again. Do it once with short text and once with text long enough to need scrolling inside the editor.
- **You should see:** The lines stay in exactly the same place and the same size when editing starts and when it ends. For the very long text, finishing returns the text to the top of the sticky.
- Also checked automatically by: `src/components/storms/sticky-text-overlay.dom.test.ts` (fitted size, no jump; finishing keeps the size); `src/components/storms/sticky-text-overlay.test.ts` (the editor box matches the sticky).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**7. Older stickies** _(storm-board, Type in a sticky: Older stickies)_
- **Do:** Open a Storm you made before this change (one with stickies that were never touched since). Look at the text. Then change one of those stickies (move it a little) and wait for "Saved".
- **You should see:** The older stickies show their text at a fitted size straight away (not all the same size). Opening the Storm alone does not make it save; moving a sticky does, as usual. If you don't have an older Storm, ask the developer for one, or write "Not testable" in Notes.
- Also checked automatically by: `src/components/storms/engine/store.test.ts` (loading a board writes nothing; moving an unsized sticky stores its size); `src/components/storms/engine/renderer.test.ts` (an unsized sticky is drawn at its fitted size).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

## 2. Colours and the toolbar

**8. Toolbar follows the selection** _(storm-board, Sticky toolbar: Toolbar follows the selection)_
- **Do:** Click a sticky. Then click empty board.
- **You should see:** A small toolbar with a round colour button appears centred just above the sticky. It disappears when you click empty board. Select a sticky at the very top of the screen: the toolbar appears below it instead.
- Also checked automatically by: `src/components/storms/sticky-toolbar.dom.test.ts` (appears and disappears; centres above, flips below); `src/components/storms/storm-board.dom.test.ts`.
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**9. Hidden while typing or dragging** _(storm-board, Sticky toolbar: Hidden while typing or dragging)_
- **Do:** With a sticky selected (toolbar showing), double-click it to type. Press Esc. Then drag the sticky to a new place and let go.
- **You should see:** The toolbar is gone while you type and while you drag, and is back above the sticky when you stop.
- Also checked automatically by: `src/components/storms/sticky-toolbar.dom.test.ts` (hidden while edited, dragged and panned).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**10. Pick a colour** _(storm-board, Sticky colour: Pick a colour)_
- **Do:** Select a yellow sticky. Click the colour button on the toolbar. A grid of 12 colours opens. Click Pink. Reload the page after "Saved" shows.
- **You should see:** The sticky turns pink. When you open the palette again, Pink is marked as the current colour. After the reload the sticky is still pink.
- Also checked automatically by: `src/components/storms/sticky-toolbar.dom.test.ts` (a click on a swatch keeps the sticky selected and saves one step; the current colour is marked); `src/components/storms/engine/store.test.ts` (setColor); `tests/integration/storm-board.test.ts` (a save with colour round-trips).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**11. Readable text on dark colours** _(storm-board, Sticky colour: Readable text on dark colours)_
- **Do:** Put some text in a sticky, then pick Black from the palette. Also try Dark blue and Dark green, and White.
- **You should see:** On Black, Dark blue and Dark green the text is white. On White the text is dark and the sticky has a thin grey border so you can see it on the board. All the other colours have dark text.
- Also checked automatically by: `src/lib/storms/palette.test.ts` (every colour and text colour pair is readable); `src/components/storms/engine/renderer.test.ts` (colours, white text on black, white sticky border); `src/components/storms/sticky-text-overlay.dom.test.ts` (the editor uses the same text colour).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**12. Undo a colour change** _(storm-board, Sticky colour: Undo a colour change)_
- **Do:** Turn a yellow sticky pink. Press Ctrl+Z (⌘+Z on Mac). Then Ctrl+Shift+Z.
- **You should see:** One press brings it back to yellow (not several steps). Redo makes it pink again.
- Also checked automatically by: `src/components/storms/engine/store.test.ts` (one history step; undo restores yellow; redo reapplies).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**13. New stickies are yellow** _(storm-board, Sticky colour: New stickies are yellow)_
- **Do:** Turn a sticky pink. Press `N` and place a new sticky.
- **You should see:** The new sticky is yellow, not pink.
- Also checked automatically by: `src/components/storms/engine/actions.test.ts` (a new sticky is yellow after another was turned pink).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**14. Palette by keyboard** _(storm-board, Sticky toolbar: Palette by keyboard)_
- **Do:** Select a sticky (click it). Without the mouse: press Tab until the colour button has a focus ring, press Enter, use the arrow keys to move to Purple, press Enter.
- **You should see:** The sticky turns purple, the palette closes, and the focus ring is back on the colour button. Esc instead of the last Enter closes the palette with no change.
- Also checked automatically by: `src/components/storms/sticky-toolbar.dom.test.ts` (Tab, Enter, arrows to Purple, Enter; focus back on the button; Esc closes).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

## 3. Saving and the server

These five protect the server. A web page cannot send a bad request, so there is little to click: the automated tests are the check. Tick Pass when they pass (see the table at the end).

**15. Someone else's storm** _(storm-saving, Server checks: Someone else's storm)_
- **Do:** Nothing in the browser. Developer: run the database tests.
- **You should see:** Saving into another user's Storm is refused as "not found" and that Storm is unchanged.
- Also checked automatically by: `tests/integration/storm-board.test.ts` (another user's storm gives not-found).
- Browser check: Not yet (automated only).
- [ ] Pass  [ ] Fail   Notes:

**16. A note's id** _(storm-saving, Server checks: A note's id)_
- **Do:** Nothing in the browser. Developer: run the database tests.
- **You should see:** Sending board changes with a note's id is refused and the note is unchanged.
- Also checked automatically by: `tests/integration/storm-board.test.ts` (a note's id gives not-found, note body unchanged).
- Browser check: Not yet (automated only).
- [ ] Pass  [ ] Fail   Notes:

**17. Malformed change** _(storm-saving, Server checks: Malformed change)_
- **Do:** Nothing in the browser. Developer: run the unit tests.
- **You should see:** A sticky with a position that isn't a number is refused and the stored board is unchanged.
- Also checked automatically by: `src/lib/storms/validate.test.ts` (rejects NaN and Infinity, out-of-range positions).
- Browser check: Not yet (automated only).
- [ ] Pass  [ ] Fail   Notes:

**18. Unknown colour** _(storm-saving, Server checks: Unknown colour)_
- **Do:** Nothing in the browser. Developer: run the unit and database tests.
- **You should see:** A sticky with the colour "#123456" is refused and the stored board is unchanged. (Sizes below 8, above 64 or with decimals are refused the same way.)
- Also checked automatically by: `src/lib/storms/validate.test.ts` (rejects a colour that is not a preset; rejects sizes out of range or not whole); `tests/integration/storm-board.test.ts` (an unknown colour is refused and the stored board is unchanged).
- Browser check: Not yet (automated only).
- [ ] Pass  [ ] Fail   Notes:

**19. Older sticky without style** _(storm-saving, Server checks: Older sticky without style)_
- **Do:** Nothing extra: step 7 shows it in the browser (an older sticky saves fine when you change it). Developer: run the tests.
- **You should see:** A sticky with no colour and no stored size is accepted.
- Also checked automatically by: `src/lib/storms/validate.test.ts` (accepts a sticky without style); `tests/integration/storm-board.test.ts` (an older sticky without style is accepted).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

## 4. Extra checks only a browser can do

**20. Long text near the edge, at three zooms** _(extra: text wraps the same on the canvas and in the editor)_
- **Do:** Make a sticky with a long line of text that almost fills the width, for example "Wonderful interconnected communication strategies for customers" (adjust until a word sits right at the end of a line). Press Esc. Set the zoom to 50%, 100% and 200% in turn (zoom control, bottom right). At each zoom, double-click the sticky to edit, look at where the lines break, then press Esc and compare.
- **You should see:** At every zoom the lines break at the same words in the editor and on the board, and nothing moves when you switch between them.
- Also checked automatically by: `src/components/storms/sticky-text-overlay.dom.test.ts` (no jump); layout in a real browser is browser only.
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**21. Zoom with a selected sticky** _(extra: toolbar follows while zooming; speed)_
- **Do:** Select a sticky so its toolbar shows. Zoom with the mouse wheel, then with a trackpad pinch if you have one, in and out several times, quickly. Then pan with two fingers or Space + drag.
- **You should see:** Smooth movement, no stutter. The toolbar stays glued above the sticky while zooming. It hides while you pan and comes back when you stop.
- Also checked automatically by: `src/components/storms/sticky-toolbar.dom.test.ts` (follows the sticky as the board pans and zooms); `npm run bench:storms` measures panning and zooming with one sticky selected (see the end).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**22. Firefox: Space on the colour button** _(extra: other browsers; optional)_
- **Do:** If you have Firefox, select a sticky, Tab to the colour button and press Space (the space bar). Then Esc.
- **You should see:** The palette opens with Space, as it does with Enter in other browsers, and Esc closes it. The button doesn't do anything strange such as opening and closing at once.
- Also checked automatically by: `src/components/storms/sticky-toolbar.dom.test.ts` (Space picks a swatch); the Firefox behaviour itself is browser only.
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**23. Swatch names on hover** _(extra: every swatch can be told apart)_
- **Do:** Open the palette and rest the mouse on each of a few swatches for a second.
- **You should see:** A small label with the colour's name (for example "Light blue") shows for each. Check that you can tell the 12 apart, including Orange from Brown.
- Also checked automatically by: `src/components/storms/sticky-toolbar.dom.test.ts` (every swatch has its colour's name); the hover label itself is browser only.
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

---

## Automated checks

Run these in a terminal in the project folder. They are for whoever maintains the code; you do not need to run them yourself.

| What | Command | Passing looks like |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | No output |
| Style rules | `npm run lint` | `0 errors` (warnings from the `.claude` folder are expected) |
| Unit tests | `npm test` | No failures |
| Database tests (several minutes, uses the dev database) | `npm run test:integration` | No failures (about 4 to 10 minutes) |
| Speed gate | Start `npx next dev -p 3101` in one terminal, then `npm run bench:storms` in another. On Windows it works as is; elsewhere use `BENCH_CHANNEL=chrome npm run bench:storms` | Five `PASS` lines (each about 60 fps, the slowest 5% of frames under 33 ms) and `Speed gate passed.` |

Exact counts from the run for this change are recorded in the group 4 report and in the task 4.4 commit.
