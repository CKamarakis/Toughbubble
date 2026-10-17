# Apply Receipt

> Generated at the end of the apply phase to mark code-implementation
> complete and provide verify with the state it needs.
> Overwritten on each apply iteration; iteration counter grows.

**Change**: `storms-canvas`
**Iteration**: `2` (test-round fixes, tasks 11.x)
**Applied at**: `2026-10-16`
**Executor**: `subagent-driven-development`

---

## Workspace

- **Worktree**: `.claude/worktrees/storms-canvas/`
- **Branch**: `feat/storms-canvas` (fast-forwarded to `design-foundation` at `d585a58`; pushed to origin)

---

## Commits

- **Range**: `d585a58..baaa921` (plus this receipt)
- **Count**: `23`

---

## Tasks

- **Completed**: `45 of 47` checkboxes in tasks.md
- **Remaining**: `10.4` (the user runs the changed testing-plan steps), `11.11` (board edge, waits for the user's step 25 retest)

---

## Evidence

- Unit: 544 tests passing (after the final fix wave). Integration: 126 passing (11 files). Types clean; lint 0 errors.
- `npx next build` + `npm run check:note-chunks`: OK (no board chunk on a note page in production).
- Speed gate: about 59.9 fps median, slowest 5% of frames ≈ 16.8 ms in every phase.
- Every unit passed a spec + quality review (fix rounds where needed); the final whole-branch review found 2 Important issues (long text from before the 500 limit blocked saving; edge pan kept running after lost pointer capture), fixed and re-reviewed clean.

## Rulings made during apply (each with its cost if wrong)

1. The 12 plan steps ran as 6 dispatch units, one commit per step. Cost: larger review diffs.
2. Pinch: a named constant at about 2.5× with a unit test; tuning on the user's trackpad happens in the hand-back. Cost: one more constant tweak.
3. 11.11 (board edge) not built; waits for the user's step 25 retest. Cost: none.
4. 11.1: no app change. A production build never loads the board on a note page (Playwright probe + build manifests); the user's failed check ran on `next dev`, which lists the route's chunks up front. A post-build check (`npm run check:note-chunks`) guards it. Cost if wrong: the chunk loads in production.
5. The "Notes don't load the board" scenario is kept; design D12 and testing-plan step 4 say it is checked on a production build. Cost: none.
6. No parallel implementers in one worktree (one unit briefly swept another's file into a commit). Cost: slower.
7. "No jump": a scrolled editor showing overflow text returns to the top on finish (the canvas always draws from the first line); the scenario says so. Cost if wrong: the user sees a snap after scrolling.
8. Sticky text is clamped to 500 in the store, not only by the textarea. Cost: none.
9. Browser checks for edge pan (sidebar edge) and pinch feel are in the user's hand-back. Cost: a UI bug found by the user.
10. Final fixes in one wave; the note-duplicate transaction holding the user's sibling lock during Storage copies is accepted (single-user app) and noted in D10. Cost: a slow duplicate briefly blocks reordering in that folder.

## Visible changes worth knowing

- Plain light grey board, no dots. Toolbar: Sticky, Undo, Redo. Esc turns the Sticky tool off.
- Zoom steps 10, 25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 350, 400%.
- Pinch zoom about 2.5× stronger; Ctrl + mouse wheel unchanged.
- Dragging a sticky near the board's edge pans the board.
- Selection outline 1 px with a 5 px gap.
- Sticky text up to 500 characters; long text scrolls in the editor. Older stickies over 500 are cut to 500 when the board opens (saved on their next change).
- Notes have Duplicate; attachments are copied as files of their own.
- `npm run dev` still shows the board chunk on note pages; production does not.

## Deferred minors (from reviews; none block)

- `check:note-chunks`: path relative to the working directory, not in CI, query-string chunk URLs, no negative test for its last step.
- The blur finish path of the text editor has no test of its own; real scrolling is browser-only (step 35).
- Drag preview not clamped near ±1,000,000 px; undo history restored from IndexedDB isn't clamped to 500 characters.
- Note duplicate: attachment ids aren't limited to the original note (safe through RLS and the save check); in-flight `copyOf` nodes are copied as they are; notes/attachments operations import each other.
- The pinch target (one pinch ≈ 100% → 200%) is untested; the ×1.25 per-event cap is a safety net that can't trigger today.

## Next step

The user runs the changed testing-plan steps (10.4) and retests step 25 (11.11). Then `/kit:verify` and `/opsx:archive`.
