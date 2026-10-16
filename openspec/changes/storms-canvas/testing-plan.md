# Storms canvas: testing plan

You are checking the first version of Storms: an endless board where you place sticky notes, move them around, zoom and pan, and undo. It should feel quick and never lose your work.

- **Time:** about 45 minutes. Sections 1-4 (the basics) take about 20.
- **You need:** the app open and signed in (the deployed site or `http://localhost:3001`), a second browser tab, a mouse and, if you have one, a laptop trackpad. Safari is optional (step 65).
- **How to use it:** do each step, look at what happens, tick **Pass** or **Fail**, and write anything odd under Notes. A failed step is useful, not a problem.
- **"Browser check 2026-10-11: Done"** means the controller already ran that step in a browser and it worked. You decide whether to repeat it; the steps marked "Not yet" are the ones nobody has looked at yet, so start there.
- **"Also checked automatically by"** names the automated test that covers the same thing. "Browser only" means no test can check it, so your eyes are the only check.
- The small italic line under each title names the requirement it covers, so we can check nothing is missed.

Tip: make a new Storm just for this test (New > Storm), and call it "Test". Anything you do in it can be thrown away.

---

## 1. Opening a storm

**1. Open a storm** _(storm-page layout: Open a storm; workspace: Open a storm)_
- **Do:** In the sidebar, click a Storm (or make one with New > Storm).
- **You should see:** A slim header with the path at the top (for example Workspace / My storm), the Storm's title and its "..." menu. The board fills all the space below it. The page itself does not scroll.
- Also checked automatically by: browser only (URL routing: `src/lib/auth/routing.test.ts`).
- Browser check 2026-10-11: Done.
- [ x] Pass  [ ] Fail   Notes:

**2. The address identifies the storm** _(workspace-tree: Open by URL; Open a storm)_
- **Do:** Copy the address from the browser bar, open a new tab, and paste it.
- **You should see:** The same Storm opens and the sidebar opens the folders around it.
- Also checked automatically by: browser only.
- Browser check 2026-10-11: Not yet.
- [ x] Pass  [ ] Fail   Notes:

**3. A note still opens as before** _(workspace-tree: Open a note; note-editor: Open a new note, Reopen a note)_
- **Do:** Open a note. For a brand new one, make a note, type a line with a bold word, leave, and come back.
- **You should see:** A new note shows the title and an empty editor saying "Start writing…". A written note comes back exactly as you left it.
- Also checked automatically by: `tests/integration/note-body.test.ts`.
- Browser check 2026-10-11: Not yet.
- [ x] Pass  [ ] Fail   Notes:

**4. Notes don't load the board** _(storm-page layout: Notes don't load the board)_
- **Do:** Reload the browser, open only a note, then press F12 (or right-click > Inspect) and click the **Network** tab, reload, and look through the files loaded. **Needs a production build; ask the developer to do this one.**
- **You should see:** Nothing that looks like the board's code (storm) loaded. Ask the developer for a production build.
- Also checked automatically by: browser only.
- Browser check 2026-10-11: Done (production build).
- [ ] Pass  [ x] Fail   Notes: 
http://localhost:3001/_next/static/chunks/src_components_storms_storm-board_tsx_18eb8n8._.js

**5. A missing item** _(workspace-tree: Item not available)_
- **Do:** Change a few letters in a Storm's address and press Enter. Also try the address of something in the Trash.
- **You should see:** A "not found" message instead of a board.
- Also checked automatically by: browser only (`tests/integration/storm-board.test.ts` covers the archived case on the server).
- Browser check 2026-10-11: Not yet.
- [x ] Pass  [ ] Fail   Notes:

## 2. Menus

**6. Storm menu** _(workspace-tree: Storm menu)_
- **Do:** Click the "..." menu in the Storm's header (and in the sidebar row).
- **You should see:** Rename, Duplicate, Move to…, Reorder, Archive, Move to Trash, in that order.
- Also checked automatically by: browser only.
- Browser check 2026-10-11: Done.
- [x ] Pass  [ ] Fail   Notes:

**7. Folder menu** _(workspace-tree: Container menu)_
- **Do:** Open a folder's "..." menu, then click "New inside".
- **You should see:** Six entries, no Convert and no Duplicate. "New inside" opens Note, Storm, Folder, Project.
- Also checked automatically by: browser only.
- Browser check 2026-10-11: Not yet.
- [ x] Pass  [ ] Fail   Notes:

**8. Note menu** _(workspace-tree: Note menu)_
- **Do:** Open a note's "..." menu.
- **You should see:** Rename, Move to…, Reorder, Archive, Move to Trash. No "New inside", no Duplicate.
- Also checked automatically by: browser only.
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**9. Submenu with the keyboard** _(workspace-tree: Submenu by keyboard)_
- **Do:** Open a menu, move down to "Reorder" with the arrow keys, press the right arrow.
- **You should see:** The submenu opens and its first available entry is highlighted.
- Also checked automatically by: browser only.
- Browser check 2026-10-11: Not yet.
- [ x] Pass  [ ] Fail   Notes:Did we remove the duplicate function from notes? if yes we should implement them again

## 3. Moving around the board

**10. The toolbar** _(bottom toolbar: Toolbar contents; Nothing to undo)_
- **Do:** Look at the bottom centre of a fresh board. Hover each button.
- **You should see:** Four buttons only: Select (V), Sticky note (N), Undo, Redo. No shape, text, image or line tools. Undo and Redo are greyed out. Each shows a tooltip with its shortcut.
- Also checked automatically by: `src/components/storms/controls-focus.dom.test.ts`; the rest is browser only.
- Browser check 2026-10-11: Not yet (the toolbar was seen working, the tooltips were not read).
- [ x] Pass  [ ] Fail   Notes: We do not need a select button to select. The button does nothing

**11. Dots follow the board** _(dot grid: Grid follows the board)_
- **Do:** Place a sticky (step 28), then drag the board with the right mouse button and zoom with the wheel.
- **You should see:** The light dots slide and grow or shrink together with the sticky, never stay still.
- Also checked automatically by: `src/components/storms/engine/dots.test.ts` and `renderer.test.ts` (spacing only).
- Browser check 2026-10-11: Not yet.
- [ x] Pass  [ ] Fail   Notes: Thedots look a bitweird. Especially when I zoom at 150> they are not helpful. Check the MIro images on assets storms for improvements

**12. Dots fade at 10%** _(dot grid: Grid fades out)_
- **Do:** Zoom out as far as it goes: click the minus at the bottom right four times from 100% (75%, 50%, 25%, 10%).
- **You should see:** No dots at all, just a plain board. Zoom in a little and they come back.
- Also checked automatically by: `src/components/storms/engine/dots.test.ts`.
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [x ] Fail   Notes:Theya re basically incvisible after 40-30%

**13. Wheel zoom toward the mouse** _(zoom: Wheel zoom toward the pointer)_
- **Do:** Place a sticky. Put the mouse pointer on a corner of it and turn the mouse wheel.
- **You should see:** The board zooms and that corner stays under the pointer. It does not slide away.
- Also checked automatically by: `src/lib/storms/camera.test.ts`, `wheel-source.test.ts`.
- Browser check 2026-10-11: Done.
- [ x] Pass  [ ] Fail   Notes:

**14. Zoom limits** _(zoom: Zoom limits)_
- **Do:** Keep zooming in with the wheel, then keep zooming out.
- **You should see:** It stops at 400% in and 10% out; the readout never goes past them.
- Also checked automatically by: `src/lib/storms/camera.test.ts`.
- Browser check 2026-10-11: Not yet.
- [ x] Pass  [ ] Fail   Notes:

**15. Plus button and readout** _(zoom: Step buttons and readout)_
- **Do:** At 100%, click + at the bottom right.
- **You should see:** The board zooms to 150% and the readout says "150%". The minus button steps back (100%, 75%, 50%...).
- Also checked automatically by: `src/lib/storms/camera.test.ts`.
- Browser check 2026-10-11: Done.
- [ ] Pass  [x ] Fail   Notes: 100% to 400% is 4 steps. DOubel that

**16. Reset to 100%** _(zoom: Reset to 100%)_
- **Do:** Click the percentage itself.
- **You should see:** The zoom goes back to 100%.
- Also checked automatically by: `src/lib/storms/camera.test.ts`.
- Browser check 2026-10-11: Done.
- [x ] Pass  [ ] Fail   Notes:

**17. The page does not zoom** _(zoom: Page zoom is not triggered)_
- **Do:** Hold Ctrl and turn the wheel over the board. Then press Ctrl and + (or =) and Ctrl and - on the keyboard. (On a Mac use Cmd.)
- **You should see:** Only the board zooms. The sidebar and header stay the same size.
- Also checked automatically by: `src/components/storms/engine/input.dom.test.ts`.
- Browser check 2026-10-11: Done (Ctrl + wheel).
- [ x] Pass  [ ] Fail   Notes:

**18. Keyboard zoom** _(zoom: keys)_
- **Do:** Click an empty spot on the board, then press Ctrl+0, then Ctrl+= twice.
- **You should see:** Ctrl+0 returns to 100%; each Ctrl+= steps up (150%, 200%).
- Also checked automatically by: `src/components/storms/engine/input.test.ts`, `input.dom.test.ts`.
- Browser check 2026-10-11: Done (Ctrl+0).
- [x ] Pass  [ ] Fail   Notes:

**19. Fit a spread-out board** _(fit to items: Fit a spread-out board)_
- **Do:** Place a sticky far left, another far right (pan or zoom out first), then click the fit button (bottom right) or press Shift+1.
- **You should see:** Every sticky is on screen with a margin around them.
- Also checked automatically by: `src/lib/storms/camera.test.ts`, `src/components/storms/engine/input.dom.test.ts`.
- Browser check 2026-10-11: Done (Shift+1).
- [ x] Pass  [ ] Fail   Notes:

**20. Fit an empty board** _(fit to items: Fit an empty board)_
- **Do:** In a new empty Storm, pan away a bit, then click fit.
- **You should see:** The board returns to its centre at 100%.
- Also checked automatically by: `src/lib/storms/camera.test.ts`.
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**21. Trackpad two-finger pan** _(pan: Trackpad pan)_
- **Do:** On a laptop trackpad, scroll with two fingers over the board.
- **You should see:** The board slides along; the zoom number does not change. (Skip if you have no trackpad.)
- Also checked automatically by: `src/lib/storms/wheel-source.test.ts` (how scrolling is told apart from a wheel).
- Browser check 2026-10-11: Not yet.
- [ x] Pass  [ ] Fail   Notes:

**22. Trackpad pinch** _(zoom: trackpad pinch; extra from design)_
- **Do:** Pinch two fingers apart and together over the board.
- **You should see:** The board zooms toward the fingers. The whole page does not zoom.
- Also checked automatically by: `src/lib/storms/wheel-source.test.ts`, `input.dom.test.ts`.
- Browser check 2026-10-11: Not yet.
- [x ] Pass  [ ] Fail   Notes: Works but not smooth! Needs efford to actually zoom in and out

**23. Right-drag pan** _(pan: Right-drag pan)_
- **Do:** Hold the right mouse button on empty board and drag. Let go.
- **You should see:** The board moves with the mouse. No browser menu appears, not even when you let go.
- Also checked automatically by: `src/components/storms/engine/input.dom.test.ts`.
- Browser check 2026-10-11: Done.
- [ x] Pass  [ ] Fail   Notes: I can move the items under the pace of teh sidebar with out the camera changing , Basiclly I can move items out of my sight and lose them out of my site

**24. Space-drag pan** _(pan: Space-drag pan)_
- **Do:** Hold Space, then drag with the left button (over a sticky too).
- **You should see:** The cursor becomes a hand and the board moves. A sticky under the mouse does not move.
- Also checked automatically by: `src/components/storms/engine/input.dom.test.ts`.
- Browser check 2026-10-11: Not yet.
- [ x] Pass  [ ] Fail   Notes:

**25. Board edge** _(pan: Board edge)_
- **Do:** Zoom out to 10%, then keep dragging the board in one direction for a long while.
- **You should see:** It eventually stops and will not go further. (Optional; it takes a while.)
- Also checked automatically by: `src/lib/storms/camera.test.ts`.
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [x] Fail   Notes:

**26. Reopen where you left** _(last view per storm: Reopen where you left)_
- **Do:** Zoom to 50%, pan somewhere, open a different item, then come back to the Storm. Reload too.
- **You should see:** The same zoom and position as before.
- Also checked automatically by: `src/components/storms/view-store.test.ts`.
- Browser check 2026-10-11: Done (reload).
- [ x] Pass  [ ] Fail   Notes:

**27. First open** _(last view per storm: First open)_
- **Do:** Make a brand new Storm and open it.
- **You should see:** The board centre at 100%.
- Also checked automatically by: `src/components/storms/view-store.test.ts`.
- Browser check 2026-10-11: Done.
- [ x] Pass  [ ] Fail   Notes:

## 4. Stickies

**28. Place a sticky** _(place a sticky: Place a sticky)_
- **Do:** Click the Sticky button (bottom centre), then click an empty spot.
- **You should see:** A yellow square sticky centred on your click, with a magenta outline (selected), and the tool goes back to Select.
- Also checked automatically by: `src/components/storms/engine/actions.test.ts`, `input.dom.test.ts`.
- Browser check 2026-10-11: Done.
- [ x] Pass  [ ] Fail   Notes: I can see that but it does not look nice. Eventually we will go with a Miro lie solutio when we imlement the arrows. Put a marging for now of 5px between the sticky and the magents border and make teh boarder slimmer

**29. N shortcut** _(place a sticky: Shortcut)_
- **Do:** Click an empty spot on the board, press N, click somewhere else.
- **You should see:** A sticky appears where you clicked.
- Also checked automatically by: `src/components/storms/engine/input.dom.test.ts`.
- Browser check 2026-10-11: Done.
- [ x] Pass  [ ] Fail   Notes:

**30. Topmost wins** _(select and move: Topmost wins)_
- **Do:** Place two stickies so they overlap. Click in the overlapping part.
- **You should see:** The one placed later (the one on top) is selected.
- Also checked automatically by: `src/lib/storms/hit-test.test.ts`.
- Browser check 2026-10-11: Not yet.
- [x ] Pass  [ ] Fail   Notes:

**31. Deselect** _(select and move: Deselect)_
- **Do:** With a sticky selected, click empty board.
- **You should see:** The outline disappears.
- Also checked automatically by: `src/components/storms/engine/input.dom.test.ts`.
- Browser check 2026-10-11: Not yet.
- [x ] Pass  [ ] Fail   Notes:

**32. Drag** _(select and move: Drag)_
- **Do:** At 100%, drag a sticky about 300 pixels to the right.
- **You should see:** It follows the mouse and ends where you let go. Dragging empty board with the left button does nothing.
- Also checked automatically by: `src/components/storms/engine/input.dom.test.ts`, `actions.test.ts`.
- Browser check 2026-10-11: Done.
- [x ] Pass  [ ] Fail   Notes:

**33. Nudge** _(select and move: Nudge)_
- **Do:** Select a sticky, press Shift and the right arrow; then the right arrow alone.
- **You should see:** Shift+arrow moves it a bit (10 px), the arrow alone a hair (1 px). The page does not scroll.
- Also checked automatically by: `src/components/storms/engine/input.dom.test.ts`, `actions.test.ts`.
- Browser check 2026-10-11: Done.
- [ x] Pass  [ ] Fail   Notes:

**34. Type in a sticky** _(type in a sticky: Type)_

- [x ] Pass  [ ] Fail   Notes:

**35. Long text is clipped** _(type in a sticky: Overflow is clipped)_
- **Do:** Type many lines into a sticky, then press Esc.
- **You should see:** Text past the sticky's edge is not shown. Double-click again: all the text is still there.
- Also checked automatically by: `src/lib/storms/text-layout.test.ts`, `engine/renderer.test.ts`.
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [ x] Fail   Notes: The text I put is not here. teh font size is suposed toadjust to text to fit things properly. I wonder waht is our character limit?

**36. The text does not jump** _(type in a sticky: No jump)_
- **Do:** Type two lines in a sticky. Watch the words as you start and finish typing, at 50%, 100% and 200% zoom.
- **You should see:** The words stay exactly where they are. No flicker or shift.
- Also checked automatically by: `src/lib/storms/text-layout.test.ts`, `sticky-text-overlay.test.ts`.
- Browser check 2026-10-11: Done (50%, 100%, 200%).
- [x ] Pass  [ ] Fail   Notes:

**37. Delete** _(delete a sticky: Delete)_
- **Do:** Select a sticky and press Delete.
- **You should see:** It disappears.
- Also checked automatically by: `src/components/storms/engine/actions.test.ts`, `input.dom.test.ts`.
- Browser check 2026-10-11: Not yet.
- [x] Pass  [ ] Fail   Notes:

**38. Backspace while typing** _(delete a sticky: Backspace while typing)_
- **Do:** Double-click a sticky with text, press Backspace a few times.
- **You should see:** Letters disappear one by one. The sticky stays.
- Also checked automatically by: `src/components/storms/engine/input.dom.test.ts`.
- Browser check 2026-10-11: Not yet.
- [ x] Pass  [ ] Fail   Notes:

## 5. Saving

**39. Saved after a pause** _(autosave: Saved after a pause)_
- **Do:** Place a sticky and wait a couple of seconds. Then reload the page.
- **You should see:** The header shows "Saving…" then "Saved". After the reload the sticky is still there.
- Also checked automatically by: `src/components/storms/use-storm-autosave.dom.test.ts`, `tests/integration/storm-board.test.ts`.
- Browser check 2026-10-11: Done.
- [ x] Pass  [ ] Fail   Notes:

**40. Typing is saved before you finish** _(autosave: Unfinished typing is saved)_
- **Do:** Double-click a sticky, type "Hello", wait until the header says "Saved", but do not press Esc. Reload.
- **You should see:** The sticky shows "Hello".
- Also checked automatically by: `src/components/storms/sticky-text-overlay.dom.test.ts`, `use-storm-autosave.dom.test.ts`.
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [ ] Fail   Notes: Not sure for this one

**41. Only changes are sent** _(autosave: Only changes are sent)_
- **Do:** Developer-minded step; skip if unsure. Press F12 (or right-click > Inspect), click the **Network** tab, move one sticky on a board with many, and look at the size of the save request.
- **You should see:** A tiny request (a few hundred bytes), not the whole board.
- Also checked automatically by: `src/lib/storms/changeset.test.ts`, `tests/integration/storm-board.test.ts` ("a move saves only that sticky").
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [ ] Fail   Notes: Check this yourself

**42. Leave warning** _(autosave: Leaving with unsaved changes)_
- **Do:** Move a sticky and immediately try to close the tab (within about a second).
- **You should see:** The browser asks whether to leave the page. If the save finished already, there is no question; try again quicker.
- Also checked automatically by: `src/components/storms/use-storm-autosave.dom.test.ts`.
- Browser check 2026-10-11: Not yet.
- [ x] Pass  [ ] Fail   Notes:

**43. Offline and retry** _(save failures and retries: Offline)_
- **Do:** Press F12 (or right-click > Inspect) and click the **Network** tab. The dropdown at the top that says "No throttling" has an **Offline** option; pick it. Move a sticky. Wait a few seconds, then set it back to **No throttling**.
- **You should see:** The header says "Couldn't save — retrying", the sticky stays where you moved it, and a bit after you are back online it says "Saved". Reload: the move is kept.
- Also checked automatically by: `src/components/storms/use-storm-autosave.dom.test.ts`, `src/components/storms/pending.test.ts`.
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**44. Board too big** _(board size limit: Too big)_
- **Do:** Hard to do by hand (needs about 2 MB of text). Skip unless curious; the tests cover it.
- **You should see:** If you manage it: "This storm is too big to save. Remove some items." and your work stays on screen.
- Also checked automatically by: `tests/integration/storm-board.test.ts` ("too large"), `use-storm-autosave.dom.test.ts`, `src/lib/storms/validate.test.ts`.
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**45. Someone else's storm** _(server checks: Someone else's storm)_
- **Do:** Nothing to click; this is a server rule.
- **You should see:** Nothing to see. Covered by the automated checks only.
- Also checked automatically by: `tests/integration/storm-board.test.ts` ("another user's storm").
- Browser check 2026-10-11: n/a.
- [ ] Pass  [ ] Fail  (leave blank)   Notes: Test this yourself

**46. A note's id** _(server checks: A note's id)_
- **Do:** Nothing to click; server rule.
- **You should see:** Covered by the automated checks only.
- Also checked automatically by: `tests/integration/storm-board.test.ts` ("a note's id").
- Browser check 2026-10-11: n/a.
- [ ] Pass  [ ] Fail  (leave blank)   Notes:

**47. Malformed change** _(server checks: Malformed change)_
- **Do:** Nothing to click; server rule.
- **You should see:** Covered by the automated checks only.
- Also checked automatically by: `src/lib/storms/validate.test.ts`, `tests/integration/storm-board.test.ts`.
- Browser check 2026-10-11: n/a.
- [ ] Pass  [ ] Fail  (leave blank)   Notes:

## 6. Two tabs

**How these steps work.** Open the same Storm in two browser windows side by side, so you can see both: tab A and tab B. To make tab B's save collide with tab A's, B must be holding a change it could not save yet. The reliable way is the Offline switch: press F12 (or right-click > Inspect), click the **Network** tab, and use the dropdown at the top that says "No throttling" to pick **Offline**. Do that in tab B only; pick "No throttling" again to go back online.

Before each of steps 48-50, start fresh: make sure both tabs show the same Storm with at least one sticky (call it Y) and "Saved" in the header, reload both tabs.

**48. Two tabs: nothing is lost** _(changed elsewhere: Two tabs)_
- **Do:** (1) In tab B set the dropdown to **Offline**. (2) In tab B move sticky Y; the header says "Couldn't save — retrying". (3) In tab A add a new sticky and wait for "Saved". (4) In tab B set the dropdown back to "No throttling" and wait a few seconds.
- **You should see:** Tab B shows a bar "This storm was changed in another tab or device. Saving is paused until you choose." and the header says "Changed elsewhere". Tab A's new sticky is safe: reload tab A and it is there.
- **Good to know:** If you simply save in A and then click into B, B quietly shows A's change with no warning. That is expected: a tab with nothing unsaved refreshes itself when you return to it (step 51). The Offline trick stops that, because B has something unsaved. If the bar does not appear, redo the step and be quicker between (2) and (3).
- Also checked automatically by: `src/components/storms/use-storm-autosave.dom.test.ts`, `tests/integration/storm-board.test.ts` ("stale base version").
- Browser check 2026-10-11: Done.
- [ ] Pass  [x ] Fail   Notes:

**49. Keep mine** _(changed elsewhere: Keep mine)_
- **Do:** Reload both tabs (if the browser asks whether to leave the page, choose Leave). Repeat 48 steps (1) to (4), with tab A adding sticky X and tab B moving sticky Y. In tab B click **Keep mine**.
- **You should see:** Tab B shows both X and the moved Y. Reload either tab: both are there.
- Also checked automatically by: `use-storm-autosave.dom.test.ts`, `tests/integration/storm-board.test.ts` ("keep-mine upsert").
- Browser check 2026-10-11: Done.
- [ ] Pass  [ ] Fail   Notes:

**50. Load latest** _(changed elsewhere: Load latest)_
- **Do:** Reload both tabs (if the browser asks whether to leave the page, choose Leave). Repeat 48 steps (1) to (4) once more (tab A adds a sticky, tab B moves Y while offline). This time in tab B click **Load latest**.
- **You should see:** Tab B shows tab A's board, with A's new sticky, and Y is back where A has it. Your move of Y in tab B is gone.
- Also checked automatically by: `use-storm-autosave.dom.test.ts`.
- Browser check 2026-10-11: Not yet.
- [ x] Pass  [ ] Fail   Notes:

**51. Refresh on focus** _(changed elsewhere: Refresh on focus)_
- **Do:** Reload both tabs and wait for "Saved". In tab A add a sticky and wait for "Saved". Then click over to tab B, touching nothing else.
- **You should see:** Within a second or two tab B quietly shows the new sticky. No warning bar.
- Also checked automatically by: `use-storm-autosave.dom.test.ts` ("returning to the tab...").
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [ ] Fail   Notes:

## 7. Undo and redo

**52. Undo a move** _(undo and redo: Undo a move)_
- **Do:** Drag a sticky, then press Ctrl+Z (Cmd+Z on a Mac). Press Ctrl+Shift+Z (or Ctrl+Y) to redo.
- **You should see:** The sticky jumps back; redo puts it back again. The header shows it saving each time.
- Also checked automatically by: `src/lib/storms/history.test.ts`, `src/components/storms/engine/input.dom.test.ts`.
- Browser check 2026-10-11: Done (undo and redo).
- [ ] Pass  [ ] Fail   Notes:

**53. Typing is one step** _(undo and redo: Typing is one step)_
- **Do:** Double-click a sticky, type "Hello", press Esc, then Ctrl+Z.
- **You should see:** The text goes back to what it was before you started, all at once.
- Also checked automatically by: `sticky-text-overlay.dom.test.ts`.
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**54. Thirty steps** _(undo and redo: Thirty steps)_
- **Do:** Optional and tedious: nudge or move things 31 separate times (wait 1 second between nudges), then press Undo 31 times.
- **You should see:** Only 30 get undone; the very first change stays.
- Also checked automatically by: `src/lib/storms/history.test.ts`.
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**55. Zoom is not undone** _(undo and redo: Zoom is not undone)_
- **Do:** Move a sticky, zoom in with the wheel, press Ctrl+Z.
- **You should see:** The sticky moves back; the zoom stays where it was.
- Also checked automatically by: `src/lib/storms/history.test.ts`, `engine/store.test.ts`.
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**56. Undo survives a reload** _(undo survives a reload: Reload keeps undo)_
- **Do:** Move a sticky, wait for "Saved", reload, press Ctrl+Z.
- **You should see:** The sticky moves back.
- Also checked automatically by: `src/components/storms/undo-store.test.ts` (rules); browser only for the real round trip.
- Browser check 2026-10-11: Done.
- [ ] Pass  [ ] Fail   Notes:

**57. Changed since, undo is dropped** _(undo survives a reload: Changed since)_
- **Do:** In tab A move a sticky and wait for "Saved". In tab B change something else in the same Storm and wait for "Saved" (use Keep mine if asked). Reload tab A.
- **You should see:** Tab A shows tab B's board and Undo is greyed out.
- Also checked automatically by: `undo-store.test.ts` ("used only if the stored version equals").
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**58. Sign-out clears undo** _(undo survives a reload: Sign-out clears history)_
- **Do:** Move a sticky, wait for "Saved". Sign out (account menu, bottom left), sign in again, open the Storm.
- **You should see:** Undo is greyed out. If you share the browser with another account, their Storm never offers your undo steps.
- Also checked automatically by: `undo-store.test.ts` (keys are per user); browser only for sign-out.
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [ ] Fail   Notes:

## 8. Duplicate

Make a Storm called "Plan" with three stickies (wait for "Saved").

**59. Duplicate** _(duplicate a storm: Duplicate)_
- **Do:** Open Plan's "..." menu > Duplicate.
- **You should see:** "Plan (copy)" appears directly below "Plan" in the sidebar, with the same three stickies, and it opens.
- Also checked automatically by: `tests/integration/storm-board.test.ts` ("copies three stickies").
- Browser check 2026-10-11: Done.
- [ ] Pass  [ ] Fail   Notes:

**60. Below the original** _(duplicate a storm: Below the original in an unarranged group)_
- **Do:** In a folder where you never rearranged anything, duplicate a Storm that is not the top one.
- **You should see:** The copy sits right under the original, not at the top of the list.
- Also checked automatically by: `tests/integration/storm-board.test.ts` ("directly below the original").
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**61. Independent copy** _(duplicate a storm: Independent copy)_
- **Do:** In "Plan (copy)" move a sticky. Open "Plan".
- **You should see:** The original's sticky has not moved.
- Also checked automatically by: `tests/integration/storm-board.test.ts` ("saving to the copy leaves the original unchanged").
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [ ] Fail   Notes:

**62. Long title** _(duplicate a storm: Long title)_
- **Do:** Rename a Storm to a very long title (paste 200 letters), then Duplicate it.
- **You should see:** The copy's title ends in " (copy)" and still fits (the end of the original name is cut instead).
- Also checked automatically by: `tests/integration/storm-board.test.ts` ("200-char title").
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [ ] Fail   Notes:

## 9. Dark mode

**63. Dark theme** _(always-light board: Dark app theme)_
- **Do:** Account menu (bottom left) > Dark. Open a Storm. Hover a toolbar button.
- **You should see:** Sidebar and header are dark. The board, the toolbar, the zoom control and the tooltips stay light.
- Also checked automatically by: `src/app/theme-contrast.test.ts` (colours only); looks are browser only.
- Browser check 2026-10-11: Done (production build).
- [ ] Pass  [ ] Fail   Notes:

## 10. Speed and other browsers

**64. Feels fast** _(extra: speed)_
- **Do:** Open the "Plan" or a board with many stickies (ask the developer to open the 1,000-sticky test page, /dev/storm-bench, on a dev server), then zoom and pan quickly.
- **You should see:** Smooth movement, no stutter.
- Also checked automatically by: `npm run bench:storms` (see the end).
- Browser check 2026-10-11: Not yet by eye (the bench passes).
- [ ] Pass  [ ] Fail   Notes:

**65. Safari** _(extra: other browsers; optional)_
- **Do:** If you have Safari, repeat steps 13, 15, 17, 22, 28 and 34 in it.
- **You should see:** The same results, and the page itself never zooms when you pinch over the board.
- Also checked automatically by: browser only.
- Browser check 2026-10-11: Not yet.
- [ ] Pass  [ ] Fail   Notes:

---

## Automated checks

Run these in a terminal in the project folder. They are for whoever maintains the code; you do not need to run them yourself.

| What | Command | Passing looks like |
| --- | --- | --- |
| Types | `npx next typegen` then `npx tsc --noEmit` | No output after the second command |
| Style rules | `npm run lint` | `0 errors` (warnings from the `.claude` folder are expected) |
| Unit tests | `npm test` | `Test Files  41 passed` and `Tests  498 passed`, no failures |
| Database tests (several minutes, uses the dev database) | `npm run test:integration` | `Test Files  10 passed` and `Tests  117 passed` (about 9 minutes) |
| Speed gate | Start `npx next dev -p 3101` in one terminal, then `npm run bench:storms` in another. On Windows it works as is; elsewhere use `BENCH_CHANNEL=chrome npm run bench:storms` | Three `PASS` lines (each about 60 fps, the slowest 5% of frames under 33 ms) and `Speed gate passed.` |

The test counts above were from the run on 2026-10-11 and will grow as tests are added.
