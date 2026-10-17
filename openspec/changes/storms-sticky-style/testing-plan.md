# Storms sticky style: testing plan

You are checking four additions to Storms: sticky text that **resizes itself to fit** (from big to small), **13 sticky colours**, a **small toolbar above the selected sticky** where you pick the colour, and a **colour palette next to the Sticky button** so you can choose the colour before you place a sticky. New stickies use the last colour you picked. It should stay quick and never lose your work.

- **Time:** about 25 minutes. Sections 1 and 2 (the main things) take about 15.
- **You need:** the app open and signed in (the deployed site or `http://localhost:3001`), a mouse and, if you have one, a laptop trackpad. Firefox is optional (step 22).
- **How to use it:** do each step, look at what happens, tick **Pass** or **Fail**, and write anything odd under Notes. A failed step is useful, not a problem.
- **"Browser check: Not yet"** means nobody has looked at the step in a browser yet. Start there.
- **"Also checked automatically by"** names the automated test that covers the same thing. "Browser only" means no test can check it, so your eyes are the only check.
- The small italic line under each title names the requirement and scenario it covers (from `specs/storm-board` and `specs/storm-saving` in this change), so we can check nothing is missed.
- Steps 10a, 13a to 13c and 23a to 23c are new since the palette was revised on 2026-10-16: tick them even if you ticked the older steps. Steps 10, 13 and 23 were rewritten.
- Steps 20 to 23c are extra checks that only a real browser can do. They were flagged during code review.

Tip: make a new Storm just for this test (New > Storm), and call it "Test". Anything you do in it can be thrown away. "Board px" means the size on the board at 100% zoom.

---

## 1. Text that fits the sticky

**1. Type** _(storm-board, Type in a sticky: Type)_
- **Do:** Place a sticky (press `N`, click the board). Double-click it, type "Ideas", and press Esc.
- **You should see:** The sticky shows "Ideas" centred.
- Also checked automatically by: `src/components/storms/sticky-text-overlay.dom.test.ts` (shows a focused textarea; Esc finishes with one undo step).
- Browser check: Not yet.
- [ x] Pass  [ ] Fail   Notes:

**2. Short text is large** _(storm-board, Type in a sticky: Short text is large)_
- **Do:** In a new empty sticky, type "Hi".
- **You should see:** Very big letters, filling much of the sticky (the largest size, 64 px).
- Also checked automatically by: `src/lib/storms/text-layout.test.ts` ("Hi" in a 200×200 sticky gives 64); `src/components/storms/engine/renderer.test.ts` (draws at its fitted size).
- Browser check: Not yet.
- [ x] Pass  [ ] Fail   Notes:

**3. Long text gets smaller** _(storm-board, Type in a sticky: Long text gets smaller)_
- **Do:** Keep typing words into the same sticky, slowly, and watch the letters.
- **You should see:** The letters shrink a little at a time as the text grows, never in big jumps, and the text always stays inside the sticky. The text in the editor is the same size as it will be after you finish.
- Also checked automatically by: `src/lib/storms/text-layout.test.ts` (growing text shrinks, each size fits); `src/components/storms/sticky-text-overlay.dom.test.ts` (the editor's size equals the fitted size after each keystroke).
- Browser check: Not yet.
- [x ] Pass  [ ] Fail   Notes:

**4. Overflow is clipped** _(storm-board, Type in a sticky: Overflow is clipped)_
- **Do:** Paste or type a very long text (about 400 to 500 characters; any long paragraph repeated will do) into a sticky. Press Esc. Then double-click the sticky again.
- **You should see:** After Esc the text is very small (8 px) and what doesn't fit is cut off at the sticky's edge. When you edit again, all of the text is there.
- Also checked automatically by: `src/lib/storms/text-layout.test.ts` (500 characters stay at least 8 and are clipped only at 8); `src/components/storms/sticky-text-overlay.dom.test.ts` (long pasted text is all in the editor).
- Browser check: Not yet.
- [ x] Pass  [ ] Fail   Notes:

**5. Paste over the limit** _(storm-board, Type in a sticky: Paste over the limit)_
- **Do:** Copy about 800 characters of text and paste it into a sticky being edited. Press Esc, then edit it again and look at the end of the text.
- **You should see:** Only the first 500 characters were kept.
- Also checked automatically by: `src/components/storms/sticky-text-overlay.dom.test.ts` (a paste of 800 characters keeps the first 500).
- Browser check: Not yet.
- [x ] Pass  [ ] Fail   Notes:

**6. No jump** _(storm-board, Type in a sticky: No jump)_
- **Do:** Type a few lines of text in a sticky and press Esc. Look closely at where each line sits. Double-click to edit again, then press Esc again. Do it once with short text and once with text long enough to need scrolling inside the editor.
- **You should see:** The lines stay in exactly the same place and the same size when editing starts and when it ends. For the very long text, finishing returns the text to the top of the sticky.
- Also checked automatically by: `src/components/storms/sticky-text-overlay.dom.test.ts` (fitted size, no jump; finishing keeps the size); `src/components/storms/sticky-text-overlay.test.ts` (the editor box matches the sticky).
- Browser check: Not yet.
- [x ] Pass  [ ] Fail   Notes: 

**7. Older stickies** _(storm-board, Type in a sticky: Older stickies)_
- **Do:** Open a Storm you made before this change (one with stickies that were never touched since). Look at the text. Then change one of those stickies (move it a little) and wait for "Saved".
- **You should see:** The older stickies show their text at a fitted size straight away (not all the same size). Opening the Storm alone does not make it save; moving a sticky does, as usual. If you don't have an older Storm, ask the developer for one, or write "Not testable" in Notes.
- Also checked automatically by: `src/components/storms/engine/store.test.ts` (loading a board writes nothing; moving an unsized sticky stores its size); `src/components/storms/engine/renderer.test.ts` (an unsized sticky is drawn at its fitted size).
- Browser check: Not yet.
- [ x] Pass  [ ] Fail   Notes:

## 2. Colours and the toolbar

**8. Toolbar follows the selection** _(storm-board, Sticky toolbar: Toolbar follows the selection)_
- **Do:** Click a sticky. Then click empty board.
- **You should see:** A small toolbar with a round colour button appears centred just above the sticky. It disappears when you click empty board. Select a sticky at the very top of the screen: the toolbar appears below it instead.
- Also checked automatically by: `src/components/storms/sticky-toolbar.dom.test.ts` (appears and disappears; centres above, flips below); `src/components/storms/storm-board.dom.test.ts`.
- Browser check: Not yet.
- [ x] Pass  [ ] Fail   Notes:

**9. Hidden while typing or dragging** _(storm-board, Sticky toolbar: Hidden while typing or dragging)_
- **Do:** With a sticky selected (toolbar showing), double-click it to type. Press Esc. Then drag the sticky to a new place and let go.
- **You should see:** The toolbar is gone while you type and while you drag, and is back above the sticky when you stop.
- Also checked automatically by: `src/components/storms/sticky-toolbar.dom.test.ts` (hidden while edited, dragged and panned).
- Browser check: Not yet.
- [ x] Pass  [ ] Fail   Notes:

**10. Pick a colour** _(storm-board, Sticky colour: Pick a colour)_
- **Do:** Select a yellow sticky. Click the colour button on the toolbar. A grid of 13 colours opens (4 per row). Click Pink. Reload the page after "Saved" shows.
- **You should see:** The sticky turns pink. When you open the palette again, Pink is marked as the current colour. After the reload the sticky is still pink.
- Also checked automatically by: `src/components/storms/sticky-toolbar.dom.test.ts` (a click on a swatch keeps the sticky selected and saves one step; the current colour is marked); `src/components/storms/engine/store.test.ts` (setColor); `tests/integration/storm-board.test.ts` (a save with colour round-trips).
- Browser check: Not yet.
- [x ] Pass  [ ] Fail   Notes:

**10a. Colour from the first palette** _(storm-board, Sticky colour: Colour from the first palette)_
- **Do:** Needs a Storm that has a sticky saved as Orange from the first palette. Ask the developer for one, or write "Not testable" in Notes. Open it and look at that sticky. Then move it a little and wait for "Saved", and reload.
- **You should see:** The old Orange sticky shows as Light yellow straight away (Red and the old Pink show as Pink, Brown as Light yellow). Opening the Storm alone does not make it save. After you move it and reload, it is still Light yellow.
- Also checked automatically by: `src/components/storms/engine/store.test.ts` (a loaded Orange sticky shows as Light yellow, its next move saves Light yellow, opening writes nothing); `src/lib/storms/validate.test.ts` (Orange is refused by the server).
- Browser check: Not yet.
- [ x] Pass  [ ] Fail   Notes:

**11. Readable text on dark colours** _(storm-board, Sticky colour: Readable text on dark colours)_
- **Do:** Put some text in a sticky, then pick Black from the palette. Also try Dark blue and Dark green, and White.
- **You should see:** On Black, Dark blue and Dark green the text is white. On White the text is dark and the sticky has a thin grey border so you can see it on the board. All the other colours have dark text.
- Also checked automatically by: `src/lib/storms/palette.test.ts` (every colour and text colour pair is readable); `src/components/storms/engine/renderer.test.ts` (colours, white text on black, white sticky border); `src/components/storms/sticky-text-overlay.dom.test.ts` (the editor uses the same text colour).
- Browser check: Not yet.
- [x ] Pass  [ ] Fail   Notes:

**12. Undo a colour change** _(storm-board, Sticky colour: Undo a colour change)_
- **Do:** Turn a yellow sticky pink. Press Ctrl+Z (⌘+Z on Mac). Then Ctrl+Shift+Z.
- **You should see:** One press brings it back to yellow (not several steps). Redo makes it pink again.
- Also checked automatically by: `src/components/storms/engine/store.test.ts` (one history step; undo restores yellow; redo reapplies).
- Browser check: Not yet.
- [x ] Pass  [ ] Fail   Notes:

**13. New stickies use the last colour** _(storm-board, Sticky colour: New stickies use the last colour)_
- **Do:** Turn a sticky pink with the toolbar. Press `N` and place a new sticky (the palette that opens can be ignored: click the board).
- **You should see:** The new sticky is pink, not yellow. The palette that opened with `N` showed Pink as the marked colour.
- Also checked automatically by: `src/components/storms/engine/actions.test.ts` and `src/components/storms/engine/store.test.ts` (a new sticky takes the colour of the last recolour); `src/components/storms/creation-color.test.ts`.
- Browser check: Not yet.
- [x ] Pass  [ ] Fail   Notes:

**13a. Pick the colour before placing** _(storm-board, Sticky colour on creation: Pick the colour before placing)_
- **Do:** Click the Sticky button in the toolbar at the bottom. A palette opens next to it (2 colours per row). Click Light green. Then click an empty spot on the board.
- **You should see:** The palette opens as soon as the Sticky tool turns on, with the colour for new stickies marked. After you pick Light green the tool stays on (the Sticky button is still pressed). Your click on the board places a light green sticky there and the palette closes. Also try: open it with `N` (same palette); press Esc (palette closes and the tool turns off); check it stays light, not dark, when the app is in dark theme.
- Also checked automatically by: `src/components/storms/sticky-tool-palette.dom.test.ts` (click Sticky opens it; pick Light green then click the board places a light green sticky and closes it; N opens it; Esc closes it and turns the tool off; keyboard path; light in dark theme).
- Browser check: Not yet.
- [x] Pass  [ ] Fail   Notes:

**13b. Remembered after a reload** _(storm-board, Sticky colour on creation: Remembered after a reload)_
- **Do:** Pick Purple (in the Sticky tool's palette or on a sticky's toolbar). Reload the page. Press `N` and click the board.
- **You should see:** The new sticky is purple. (The colour is remembered in this browser for your account, so another browser starts again at yellow.)
- Also checked automatically by: `src/components/storms/creation-color.test.ts` (the stored value survives a new store; a corrupt value gives Yellow); `src/components/storms/engine/store.test.ts`.
- Browser check: Not yet.
- [ x] Pass  [ ] Fail   Notes: It works but this is not a requirement. Good to have if it light


**13c. First use** _(storm-board, Sticky colour on creation: First use)_
- **Do:** Use a browser or private window where you have never picked a colour in Storms (or ask the developer to clear the site data for the app). Press `N` and click the board.
- **You should see:** The new sticky is yellow, and Yellow is the marked colour in the palette.
- Also checked automatically by: `src/components/storms/creation-color.test.ts` (first use gives Yellow).
- Browser check: Not yet.
- [x ] Pass  [ ] Fail   Notes:

**14. Palette by keyboard** _(storm-board, Sticky toolbar: Palette by keyboard)_
- **Do:** Select a sticky (click it). Without the mouse: press Tab until the colour button has a focus ring, press Enter, use the arrow keys to move to Purple, press Enter.
- **You should see:** The sticky turns purple, the palette closes, and the focus ring is back on the colour button. Esc instead of the last Enter closes the palette with no change.
- Also checked automatically by: `src/components/storms/sticky-toolbar.dom.test.ts` (Tab, Enter, arrows to Purple, Enter; focus back on the button; Esc closes).
- Browser check: Not yet.
- [ ] Pass  [ x] Fail   Notes: It does reach up to selcting the color but pressing eneter allows me toright inside the sticky instead. This is minor
- Fixed 2026-10-17: the board read Enter before the palette did and opened the sticky for typing (arrows also nudged it). Keys that a focused button or swatch uses now stay with it. Test: `input.dom.test.ts` ("Enter, Space and arrows on a control inside the board are left to the control"). Retest: Not yet.

## 3. Saving and the server

These five protect the server. A web page cannot send a bad request, so there is little to click: the automated tests are the check. Tick Pass when they pass (see the table at the end).

**15. Someone else's storm** _(storm-saving, Server checks: Someone else's storm)_
- **Do:** Nothing in the browser. Developer: run the database tests.
- **You should see:** Saving into another user's Storm is refused as "not found" and that Storm is unchanged.
- Also checked automatically by: `tests/integration/storm-board.test.ts` (another user's storm gives not-found).
- Browser check: Not yet (automated only).
- [x ] Pass  [ ] Fail   Notes:

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
- [x ] Pass  [ ] Fail   Notes: Backawards compatibility is important but we since we have not relased yet and fixed teh default bahavior to the end let's not add layers that will be useless later. Excellent practise but too early

## 4. Extra checks only a browser can do

**20. Long text near the edge, at three zooms** _(extra: text wraps the same on the canvas and in the editor)_
- **Do:** Make a sticky with a long line of text that almost fills the width, for example "Wonderful interconnected communication strategies for customers" (adjust until a word sits right at the end of a line). Press Esc. Set the zoom to 50%, 100% and 200% in turn (zoom control, bottom right). At each zoom, double-click the sticky to edit, look at where the lines break, then press Esc and compare.
- **You should see:** At every zoom the lines break at the same words in the editor and on the board, and nothing moves when you switch between them.
- Also checked automatically by: `src/components/storms/sticky-text-overlay.dom.test.ts` (no jump); layout in a real browser is browser only.
- Browser check: Not yet.
- [x ] Pass  [ ] Fail   Notes:

**21. Zoom with a selected sticky** _(extra: toolbar follows while zooming; speed)_
- **Do:** Select a sticky so its toolbar shows. Zoom with the mouse wheel, then with a trackpad pinch if you have one, in and out several times, quickly. Then pan with two fingers or Space + drag.
- **You should see:** Smooth movement, no stutter. The toolbar stays glued above the sticky while zooming. It hides while you pan and comes back when you stop.
- Also checked automatically by: `src/components/storms/sticky-toolbar.dom.test.ts` (follows the sticky as the board pans and zooms); `npm run bench:storms` measures panning and zooming with one sticky selected (see the end).
- Browser check: Not yet.
- [x ] Pass  [ ] Fail   Notes:

**22. Firefox: Space on the colour button** _(extra: other browsers; optional)_
- **Do:** If you have Firefox, select a sticky, Tab to the colour button and press Space (the space bar). Then Esc.
- **You should see:** The palette opens with Space, as it does with Enter in other browsers, and Esc closes it. The button doesn't do anything strange such as opening and closing at once.
- Also checked automatically by: `src/components/storms/sticky-toolbar.dom.test.ts` (Space picks a swatch); the Firefox behaviour itself is browser only.
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes: Not immportant for now

**23. Swatch names on hover** _(extra: every swatch can be told apart)_
- **Do:** Open the palette and rest the mouse on each of a few swatches for a second.
- **You should see:** A small label with the colour's name (for example "Light blue") shows for each. Check that you can tell the 13 apart, especially the close pairs: Yellow and Light yellow, Pink and Magenta, Lavender and Purple, Sky blue and Light blue.
- Also checked automatically by: `src/components/storms/sticky-toolbar.dom.test.ts` (every swatch has its colour's name); the hover label itself is browser only.
- Browser check: Not yet.
- [x ] Pass  [ ] Fail   Notes:

**23a. Sticky tool palette on a short window** _(extra: the palette fits above the toolbar)_
- **Do:** Make the browser window short (about 500 px high, or zoom the browser page in to 200%). Click the Sticky button.
- **You should see:** The palette shows 4 colours per row instead of 2, so all 13 fit on screen without being cut off or covered by the top of the window.
- Also checked automatically by: `src/components/storms/sticky-tool-palette.dom.test.ts` (4 per row when 2 per row would not fit); the real layout is browser only.
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes: In general the sticky button palette shows 4 and the bottom "creatre sticky" 2 per row. I did not see any change. It is fine

**23b. Tooltip does not hide the palette** _(extra: the Sticky button's tooltip)_
- **Do:** Hover the Sticky button for a second, then click it and keep the mouse on the button.
- **You should see:** The "Sticky" tooltip does not sit on top of the palette or hide any swatch. Move the mouse onto the palette: it stays open.
- Also checked automatically by: browser only.
- Browser check: Not yet.
- [ x] Pass  [ ] Fail   Notes:

**23c. Keyboard open and mouse open** _(extra: where focus goes)_
- **Do:** First with the mouse: click the Sticky button, then press the arrow keys. Press Esc. Then with the keyboard only: Tab to the Sticky button, press Enter, use the arrows, press Enter on a colour, press Esc.
- **You should see:** After a mouse open the arrow keys still move through the swatches (the first key moves the focus ring to the current colour). After a keyboard open focus starts on the current swatch, Enter picks it and the tool stays on, and Esc closes the palette and turns the tool off. Pressing `N` afterwards does not drag focus into the palette.
- Also checked automatically by: `src/components/storms/sticky-tool-palette.dom.test.ts` (keyboard path; keyboard open is decided by the click, not by focus); the real focus ring is browser only.
- Browser check: Not yet.
- [ x] Pass  [ ] Fail   Notes:

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
