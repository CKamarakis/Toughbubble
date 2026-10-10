import { describe, expect, it } from "vitest";
import type { ChangeSet } from "./changeset";
import { EMPTY_HISTORY, MAX_STEPS, pushStep, replaceTop, takeRedo, takeUndo, type Step } from "./history";

const step = (id: string): Step => {
  const cs: ChangeSet = { upsert: [], delete: [id] };
  return { do: cs, undo: { upsert: [], delete: [] } };
};

describe("history", () => {
  it("31 pushes keep 30", () => {
    let h = EMPTY_HISTORY;
    for (let i = 0; i < 31; i++) h = pushStep(h, step(String(i)));
    expect(h.undo).toHaveLength(MAX_STEPS);
    expect(h.undo[0].do.delete).toEqual(["1"]);
    expect(h.undo[29].do.delete).toEqual(["30"]);
  });

  it("push clears redo", () => {
    let h = pushStep(EMPTY_HISTORY, step("a"));
    h = takeUndo(h)!.history;
    expect(h.redo).toHaveLength(1);
    expect(pushStep(h, step("b")).redo).toEqual([]);
  });

  it("undo then redo returns the same step", () => {
    const s = step("a");
    const u = takeUndo(pushStep(EMPTY_HISTORY, s))!;
    expect(u.step).toBe(s);
    expect(u.history.undo).toEqual([]);
    const r = takeRedo(u.history)!;
    expect(r.step).toBe(s);
    expect(r.history.undo).toEqual([s]);
    expect(r.history.redo).toEqual([]);
  });

  it("takeUndo on empty returns null", () => {
    expect(takeUndo(EMPTY_HISTORY)).toBeNull();
    expect(takeRedo(EMPTY_HISTORY)).toBeNull();
  });

  it("replaceTop swaps the last step and clears redo", () => {
    const h = takeUndo(pushStep(pushStep(pushStep(EMPTY_HISTORY, step("a")), step("b")), step("c")))!.history;
    expect(h.redo).toHaveLength(1);
    const r = replaceTop(h, step("e"));
    expect(r.undo.map((s) => s.do.delete[0])).toEqual(["a", "e"]);
    expect(r.redo).toEqual([]);
  });

  it("replaceTop on empty pushes", () => {
    expect(replaceTop(EMPTY_HISTORY, step("a")).undo).toHaveLength(1);
  });
});
