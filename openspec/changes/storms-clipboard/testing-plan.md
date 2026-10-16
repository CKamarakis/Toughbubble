# Storms clipboard: testing plan

You are checking copy, paste and duplicate for stickies on a Storm board: **Ctrl+C**, **Ctrl+V** and **Ctrl+D** (⌘ on a Mac). They should work like in Miro, and never lose your work.

- **Time:** about 20 minutes. Steps 1 to 7 (the basics) take about 10.
- **You need:** the app open and signed in (the deployed site or `http://localhost:3001`), a second browser tab, and a second Storm. Safari is optional (step 9). Chrome or Firefox for step 10.
- **How to use it:** do each step, look at what happens, tick **Pass** or **Fail**, and write anything odd under Notes. A failed step is useful, not a problem.
- **"Browser check: Not yet"** means nobody has looked at the step in a browser yet. Start there.
- **"Also checked automatically by"** names the automated test that covers the same thing. "Browser only" means no test can check it, so your eyes are the only check.
- The small italic line under each title names the requirement and scenario it covers (from `specs/storm-board` in this change), so we can check nothing is missed.
- Steps 8 to 13 are extra checks that only a real browser can do.
- The keys only work while the board has focus (click the board first) and no sticky's text is being edited.

Tip: make two new Storms just for this test (New > Storm), and call them "Test" and "Test 2". Anything you do in them can be thrown away.

---

## 1. Copy, paste and duplicate

**1. Copy and paste at the pointer** _(storm-board, Copy, paste and duplicate: Copy and paste at the pointer)_
- **Do:** In "Test", place a sticky, type "Plan" and press Esc. Turn it pink (click it, then the colour button above it). With it selected press Ctrl+C. Move the mouse to an empty spot and press Ctrl+V. Then move the mouse to another spot and press Ctrl+V again.
- **You should see:** A pink sticky "Plan" of the same size appears centred on the mouse pointer, on top and selected (with its toolbar above it). The second paste goes to the new pointer position. Move the pointer off the board (over the sidebar) and press Ctrl+V: the copy appears at the centre of the view.
- Also checked automatically by: `src/components/storms/engine/input.dom.test.ts` (copy writes both types; paste of the custom type places a copy at the pointer); `src/components/storms/engine/actions.test.ts` (pasted sticky is on top, selected, one undo step).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**2. Paste in another Storm** _(storm-board, Copy, paste and duplicate: Paste in another Storm)_
- **Do:** Copy a sticky in "Test" (select it, Ctrl+C). Open "Test 2" from the sidebar, click an empty spot on its board to give it focus, and press Ctrl+V.
- **You should see:** A copy of the sticky appears in "Test 2" with the same text, colour and size. Wait for "Saved", reload, and it is still there.
- Also checked automatically by: `src/components/storms/engine/input.dom.test.ts` (paste of the copied format); `src/lib/storms/clipboard.test.ts` (copy round trip). The two-Storm flow itself is browser only.
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**3. Duplicate** _(storm-board, Copy, paste and duplicate: Duplicate)_
- **Do:** Select a sticky and press Ctrl+D (Chrome or Firefox: watch for a "bookmark" box at the top of the window).
- **You should see:** A copy appears directly to the right with a gap of 20 px (about a thumb's width at 100% zoom), on top and selected. The browser's bookmark box does **not** open.
- Also checked automatically by: `src/components/storms/engine/input.dom.test.ts` (Ctrl+D duplicates and its default is prevented); `src/components/storms/engine/actions.test.ts` (lands at x + width + 20, same y); `src/components/storms/engine/input.test.ts` (route).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**4. Undo a paste** _(storm-board, Copy, paste and duplicate: Undo a paste)_
- **Do:** Paste a sticky (Ctrl+V). Press Ctrl+Z (⌘+Z on Mac). Do the same with Ctrl+D.
- **You should see:** One press removes the pasted sticky (or the duplicate), not more. The original is unchanged. Ctrl+Shift+Z brings the copy back.
- Also checked automatically by: `src/components/storms/engine/actions.test.ts` (one undo step each; undo removes the copy and leaves the original).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**5. Paste text from elsewhere** _(storm-board, Copy, paste and duplicate: Paste text from elsewhere)_
- **Do:** In another app or tab, select the words "Call Anna" and copy them. Turn the new-sticky colour to something recognisable first (for example Light green: click Sticky, pick Light green, press Esc). Back in the Storm, click the board, move the mouse to an empty spot and press Ctrl+V.
- **You should see:** A new light green sticky with "Call Anna" appears at the pointer (the colour for new stickies, not yellow). Also try copying a very long text (over 500 characters): the sticky keeps the first 500.
- Also checked automatically by: `src/components/storms/engine/input.dom.test.ts` (plain text creates a sticky in the creation colour); `src/lib/storms/clipboard.test.ts` (text cut to 500).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**6. Copy text while typing** _(storm-board, Copy, paste and duplicate: Copy text while typing)_
- **Do:** Double-click a sticky to edit it. Select a word in the text, press Ctrl+C, move the cursor to the end and press Ctrl+V.
- **You should see:** The word is pasted into the text inside the sticky. No new sticky is made on the board. Also press Ctrl+D while typing: nothing is duplicated.
- Also checked automatically by: `src/components/storms/engine/input.dom.test.ts` (while editing, the copy and paste events are not intercepted).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**7. Nothing selected** _(storm-board, Copy, paste and duplicate: Nothing selected)_
- **Do:** Click empty board so nothing is selected. Press Ctrl+C. Press Ctrl+D.
- **You should see:** Nothing happens on the board. (Ctrl+D with nothing selected may still open the browser's bookmark box: that is accepted.)
- Also checked automatically by: `src/components/storms/engine/input.dom.test.ts` (with nothing selected, copy does nothing); `src/components/storms/engine/input.test.ts` (Ctrl+D routes only with a sticky selected); `src/components/storms/engine/actions.test.ts` (nothing selected, no change).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

## 2. Extra checks only a browser can do

**8. Paste in another tab** _(extra: the clipboard format crosses tabs)_
- **Do:** Open the same Storm (or another one) in a second tab. In tab 1 select a sticky and press Ctrl+C. Switch to tab 2, click the board, and press Ctrl+V.
- **You should see:** The sticky is pasted in tab 2 with the same text, colour and size, as a new sticky (not the same one).
- Also checked automatically by: browser only (the format is tested in `src/lib/storms/clipboard.test.ts`).
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**9. Safari: the fallback** _(extra: Safari may drop the custom copy type; optional)_
- **Do:** In Safari, select a pink sticky with text "Plan", press ⌘C, move the mouse to an empty spot and press ⌘V. Also try copying in Chrome and pasting in Safari if both are open.
- **You should see:** Either a pink "Plan" sticky (the full copy), or, if Safari drops the custom type, a sticky with the text "Plan" in the colour for new stickies. Either is acceptable; write which one happened in Notes. Nothing should break.
- Also checked automatically by: `src/components/storms/engine/input.dom.test.ts` (plain text creates a sticky); Safari itself is browser only.
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**10. The bookmark box stays closed** _(extra: Ctrl+D in Chrome and Firefox)_
- **Do:** In Chrome, then Firefox: click a sticky and press Ctrl+D several times. Then click empty board and press Ctrl+D once.
- **You should see:** With a sticky selected, no bookmark box ever opens, and every press adds a copy. With nothing selected the browser may open its bookmark box (accepted); close it with Esc.
- Also checked automatically by: `src/components/storms/engine/input.dom.test.ts` (the keydown default is prevented); the browser's own shortcut is browser only.
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**11. While the colour palette is open** _(extra: the palette takes the keys)_
- **Do:** Select a sticky and click the colour button on its toolbar, so the palette is open. Press Ctrl+C, Ctrl+V and Ctrl+D. Then press Esc. Repeat with the Sticky tool's palette: click the Sticky button, then press Ctrl+V with a sticky copied earlier.
- **You should see:** Nothing is copied, pasted or duplicated while the palette is open; no new sticky appears. After Esc the shortcuts work again.
- Also checked automatically by: `src/components/storms/sticky-toolbar.dom.test.ts` (with the palette open, board keys are not acted on); how it feels is browser only.
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**12. Duplicate while dragging** _(extra: known limit)_
- **Do:** Press the mouse on a sticky and start dragging it. While still holding, press Ctrl+D.
- **You should see:** The copy lands next to where the sticky was **before** the drag started (not next to its current position). This is known and accepted; write down if anything else odd happens (the original jumping, two copies).
- Also checked automatically by: browser only.
- Browser check: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**13. Paste at different zooms** _(extra: paste lands under the pointer)_
- **Do:** Copy a sticky. Set the zoom to 50%, move the pointer to an empty spot and press Ctrl+V. Repeat at 200%. Then pan far away and paste.
- **You should see:** At every zoom the pasted sticky is centred on the pointer, keeping its size on the board (it looks half as big at 50%).
- Also checked automatically by: `src/lib/storms/clipboard.test.ts` (copy centred on the point and clamped); the pointer position at a zoom is browser only.
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

Results of the round-2 run (2026-10-17): types clean; lint 0 errors (94 warnings); unit 46 files, 736 tests passed; database tests 11 files, 129 tests passed; speed gate passed (all five PASS, about 59.9 fps).
