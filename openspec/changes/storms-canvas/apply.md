# Apply Receipt

> Generated at the end of the apply phase to mark code-implementation
> complete and provide verify with the state it needs.
> Overwritten on each apply iteration; iteration counter grows.

**Change**: `storms-canvas`
**Iteration**: `1`
**Applied at**: `2026-10-11`
**Executor**: `subagent-driven-development`

---

## Workspace

- **Worktree**: `.claude/worktrees/storms-canvas/`
- **Branch**: `feat/storms-canvas` (from `design-foundation` at `c80606f`; pushed to origin)

---

## Commits

- **Range**: `c80606f..5c2be04`
- **Count**: `53`

---

## Tasks

- **Completed**: `33 of 34` checkboxes in tasks.md flipped to `- [x]`
- **Remaining**: `10.4` — the user runs `testing-plan.md` and records pass/fail

---

## Evidence

- Unit: 514 tests passing. Storm integration: 20 passing. Full integration suite last run before the final fix wave: 117 passing.
- Types clean; lint 0 errors (94 warnings, all in `.claude/skills/impeccable/scripts`, outside this change).
- Speed gate (`npm run bench:storms`, 1,000 stickies, 4× CPU throttle): about 59.9 fps median, slowest 5% of frames ≈ 16.8 ms, in every phase.
- Every task passed a spec + quality review (fix rounds where needed); a final whole-branch review found 2 Important issues (undo-history persistence), fixed and re-reviewed.
- Controller browser pass (dev and production build): see `testing-plan.md` marks.

## Rulings made during apply (each with its cost if wrong)

1. Implementers committed only; the controller pushed after each reviewed task. Cost: pushes lag one task.
2. Tasks could touch files missing from the plan's file lists when their own steps required it. Cost: slightly larger diffs.
3. `routeKey` returns "undo"/"redo" action names; wired to the store. Cost: none.
4. One dispatch per plan heading (21 units). Cost: more overhead.
5. Deletes go first in a split; later also capped at 5,000 per chunk (final review). Cost: none now.
6. Mixed-case UUIDs count as different ids (validator uses the notes regex). Cost: a duplicate sticky only on a hand-crafted request.
7. Save action guards are checked by reading, not a test (actions aren't reachable from unit tests). Cost: a guard bug found late.
8. A corrupt stored body loads as an empty board at its version and is logged. Cost: a corrupted board appears empty.
9. Browser checks batched into one controller pass plus the user's testing plan. Cost: a UI bug found later.
10. Store semantics pinned (merge-top, one step per text edit, replaceBoard silent, vanished selection clears). Cost: small changes later.
11. Undo/redo end an open text edit first; starting an edit selects the sticky. Cost: trivial to remove.
12. Drag preview drawn from a transient store field; one save on release. Cost: none.
13. Full undo history written to IndexedDB on each quiet save (plan-mandated); fine while steps are single stickies — revisit in storms-arrange (bulk delete). Cost: main-thread work for large histories later.
14. Speed test runs its own dev server on port 3101. Cost: none.
15. Speed bar kept at the PRD's 33 ms for the slowest 5% of frames (measured ≈ 16.8 ms). **Needs the user's confirmation.**
16. Leftover servers on 3101/3102 were the controller's own; killed. Cost: none.

## Visible changes worth knowing

- Sticky shadows are drawn only at 50% zoom and above (speed).
- The dot grid thins out when zoomed far out, then fades away below 20%.
- Mouse-wheel or pinch over the toolbar and zoom control zooms or pans the board.
- Fit on a single sticky zooms close to 350% (within 10–400%).

## Next step

Run verify (`openspec-verify-change` → `verify.md`), then `/kit:verify` before archive. Finalize merges `feat/storms-canvas` into `design-foundation` — needs the user's go-ahead.
