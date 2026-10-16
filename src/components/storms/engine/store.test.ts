import { describe, expect, it } from "vitest";
import type { ChangeSet } from "@/lib/storms/changeset";
import { pushStep, EMPTY_HISTORY } from "@/lib/storms/history";
import type { Sticky, StormBody } from "@/lib/storms/model";
import { fitFontSize, type SizedMeasure } from "@/lib/storms/text-layout";
import { validateChangeSet } from "@/lib/storms/validate";
import { moveSticky } from "./actions";
import { createStormStore } from "./store";

const sticky = (id: string, over: Partial<Sticky> = {}): Sticky => ({
  id,
  type: "sticky",
  x: 0,
  y: 0,
  z: "a0",
  w: 200,
  h: 200,
  text: "",
  ...over,
});

const board = (...items: Sticky[]): StormBody => ({
  schema: 1,
  items: Object.fromEntries(items.map((i) => [i.id, i])),
});

const camera = { x: 0, y: 0, zoom: 1 };

function setup(body: StormBody = board()) {
  const store = createStormStore({ body, camera });
  const emitted: ChangeSet[] = [];
  store.onChange((cs) => emitted.push(cs));
  let notified = 0;
  store.subscribe(() => notified++);
  let frames = 0;
  store.onFrame(() => frames++);
  return { store, emitted, notified: () => notified, frames: () => frames };
}

describe("storm store", () => {
  it("commit applies and pushes history", () => {
    const { store, notified, frames } = setup();
    const a = sticky("a");
    store.commit({ upsert: [a], delete: [] });
    const snap = store.getSnapshot();
    expect(snap.items).toEqual({ a });
    expect(snap.canUndo).toBe(true);
    expect(snap.canRedo).toBe(false);
    expect(store.getHistory().undo).toEqual([
      { do: { upsert: [a], delete: [] }, undo: { upsert: [], delete: ["a"] } },
    ]);
    expect(notified()).toBe(1);
    expect(frames()).toBe(1);
  });

  it("commit emits the change set to onChange", () => {
    const { store, emitted } = setup();
    const cs: ChangeSet = { upsert: [sticky("a")], delete: [] };
    store.commit(cs);
    store.commit({ upsert: [sticky("b")], delete: [] }, "none");
    expect(emitted).toEqual([cs, { upsert: [sticky("b")], delete: [] }]);
    expect(store.getHistory().undo).toHaveLength(1);
  });

  it("an empty change set is a no-op", () => {
    const { store, emitted, notified } = setup();
    const before = store.getSnapshot();
    store.commit({ upsert: [], delete: [] });
    expect(store.getSnapshot()).toBe(before);
    expect(emitted).toEqual([]);
    expect(notified()).toBe(0);
  });

  it("undo emits the inverse and redo re-emits", () => {
    const { store, emitted } = setup(board(sticky("a", { x: 0 })));
    const moved = sticky("a", { x: 10 });
    store.commit({ upsert: [moved], delete: [] });
    emitted.length = 0;

    store.undo();
    expect(store.getSnapshot().items.a.x).toBe(0);
    expect(emitted).toEqual([{ upsert: [sticky("a", { x: 0 })], delete: [] }]);
    expect(store.getSnapshot().canUndo).toBe(false);
    expect(store.getSnapshot().canRedo).toBe(true);

    store.redo();
    expect(store.getSnapshot().items.a.x).toBe(10);
    expect(emitted[1]).toEqual({ upsert: [moved], delete: [] });
    expect(store.getSnapshot().canUndo).toBe(true);
    expect(store.getSnapshot().canRedo).toBe(false);
  });

  it("undo and redo with empty stacks do nothing", () => {
    const { store, emitted, notified } = setup();
    store.undo();
    store.redo();
    expect(emitted).toEqual([]);
    expect(notified()).toBe(0);
  });

  it("merge-top replaces the last step", () => {
    const { store, emitted } = setup(board(sticky("a", { x: 0 })));
    store.commit({ upsert: [sticky("a", { x: 1 })], delete: [] }, "merge-top");
    store.commit({ upsert: [sticky("a", { x: 2 })], delete: [] }, "merge-top");
    store.commit({ upsert: [sticky("a", { x: 3 })], delete: [] }, "merge-top");
    expect(emitted).toHaveLength(3);
    const h = store.getHistory();
    expect(h.undo).toHaveLength(1);
    expect(h.undo[0]).toEqual({
      do: { upsert: [sticky("a", { x: 3 })], delete: [] },
      undo: { upsert: [sticky("a", { x: 0 })], delete: [] },
    });
    store.undo();
    expect(store.getSnapshot().items.a.x).toBe(0);
  });

  it("merge-top keeps earlier steps and creates then removes cleanly", () => {
    const { store } = setup();
    store.commit({ upsert: [sticky("a")], delete: [] });
    store.commit({ upsert: [sticky("b", { x: 1 })], delete: [] }, "push");
    store.commit({ upsert: [sticky("b", { x: 2 })], delete: [] }, "merge-top");
    expect(store.getHistory().undo).toHaveLength(2);
    store.undo();
    expect(Object.keys(store.getSnapshot().items)).toEqual(["a"]);
  });

  it("setCamera does not touch history or emit", () => {
    const { store, emitted, notified, frames } = setup();
    const history = store.getHistory();
    store.setCamera({ x: 5, y: 6, zoom: 2 });
    expect(store.getSnapshot().camera).toEqual({ x: 5, y: 6, zoom: 2 });
    expect(store.getHistory()).toBe(history);
    expect(emitted).toEqual([]);
    expect(notified()).toBe(1);
    expect(frames()).toBe(1);
  });

  it("tool and selection change the snapshot without history", () => {
    const { store, emitted } = setup(board(sticky("a")));
    store.setTool("sticky");
    store.select("a");
    expect(store.getSnapshot()).toMatchObject({ tool: "sticky", selectedId: "a", canUndo: false });
    expect(emitted).toEqual([]);
  });

  it("selection of a deleted item is cleared", () => {
    const { store } = setup(board(sticky("a")));
    store.select("a");
    store.commit({ upsert: [], delete: ["a"] });
    expect(store.getSnapshot().selectedId).toBeNull();
    store.undo();
    store.select("a");
    store.undo(); // nothing left to undo; still selected
    expect(store.getSnapshot().selectedId).toBe("a");
  });

  it("edit session: three setText calls + endEdit → one undo step restoring the original text", () => {
    const { store, emitted } = setup(board(sticky("a", { text: "hi" })));
    store.startEdit("a");
    expect(store.getSnapshot().editingId).toBe("a");
    store.setText("a", "h");
    store.setText("a", "ho");
    store.setText("a", "hop");
    expect(emitted).toHaveLength(3);
    expect(emitted[2]).toEqual({ upsert: [sticky("a", { text: "hop" })], delete: [] });
    expect(store.getHistory().undo).toHaveLength(0);

    store.endEdit();
    expect(emitted).toHaveLength(3);
    expect(store.getSnapshot().editingId).toBeNull();
    expect(store.getHistory().undo).toEqual([
      {
        do: { upsert: [sticky("a", { text: "hop" })], delete: [] },
        undo: { upsert: [sticky("a", { text: "hi" })], delete: [] },
      },
    ]);
    store.undo();
    expect(store.getSnapshot().items.a.text).toBe("hi");
  });

  it("endEdit without a text change adds no step", () => {
    const { store } = setup(board(sticky("a", { text: "hi" })));
    store.startEdit("a");
    store.setText("a", "ho");
    store.setText("a", "hi");
    store.endEdit();
    expect(store.getHistory().undo).toHaveLength(0);
  });

  it("startEdit on another sticky ends the previous session first", () => {
    const { store } = setup(board(sticky("a", { text: "1" }), sticky("b", { text: "2" })));
    store.startEdit("a");
    store.setText("a", "one");
    store.startEdit("b");
    expect(store.getSnapshot().editingId).toBe("b");
    expect(store.getHistory().undo).toHaveLength(1);
    expect(store.getHistory().undo[0].undo).toEqual({
      upsert: [sticky("a", { text: "1" })],
      delete: [],
    });
  });

  it("replaceBoard clears history and does not emit", () => {
    const { store, emitted, notified, frames } = setup(board(sticky("a")));
    store.select("a");
    store.commit({ upsert: [sticky("b")], delete: [] });
    store.startEdit("b");
    emitted.length = 0;
    const n = notified();
    const f = frames();

    store.replaceBoard(board(sticky("c")));
    const snap = store.getSnapshot();
    expect(Object.keys(snap.items)).toEqual(["c"]);
    expect(snap).toMatchObject({ selectedId: null, editingId: null, canUndo: false, canRedo: false });
    expect(store.getHistory()).toEqual(EMPTY_HISTORY);
    expect(emitted).toEqual([]);
    expect(notified()).toBeGreaterThan(n);
    expect(frames()).toBeGreaterThan(f);
  });

  it("replaceBoard tells onReplace listeners, after the new board is in place", () => {
    const { store } = setup(board(sticky("a")));
    const seen: string[][] = [];
    const off = store.onReplace(() => seen.push(Object.keys(store.getSnapshot().items)));
    store.replaceBoard(board(sticky("c")));
    expect(seen).toEqual([["c"]]);
    off();
    store.replaceBoard(board());
    expect(seen).toHaveLength(1);
  });

  it("getSnapshot is referentially stable without changes", () => {
    const { store } = setup(board(sticky("a")));
    const s1 = store.getSnapshot();
    expect(store.getSnapshot()).toBe(s1);
    store.select(null);
    store.setTool("select");
    store.setCamera({ ...camera });
    expect(store.getSnapshot()).toBe(s1);

    store.select("a");
    const s2 = store.getSnapshot();
    expect(s2).not.toBe(s1);
    expect(s2.revision).toBe(s1.revision + 1);
    expect(store.getSnapshot()).toBe(s2);
  });

  it("starts from a given history", () => {
    const a = sticky("a");
    const history = pushStep(EMPTY_HISTORY, {
      do: { upsert: [a], delete: [] },
      undo: { upsert: [], delete: ["a"] },
    });
    const store = createStormStore({ body: board(a), camera, history });
    expect(store.getSnapshot().canUndo).toBe(true);
    store.undo();
    expect(store.getSnapshot().items).toEqual({});
  });

  it("a commit made while notifying reaches every onChange listener after the first", () => {
    const store = createStormStore({ body: board(), camera });
    const cs1: ChangeSet = { upsert: [sticky("a", { x: 1 })], delete: [] };
    const cs2: ChangeSet = { upsert: [sticky("a", { x: 2 })], delete: [] };
    const seen: [string, ChangeSet][] = [];
    store.onChange((cs) => seen.push(["first", cs]));
    store.onChange((cs) => seen.push(["second", cs]));
    let done = false;
    store.subscribe(() => {
      if (done) return;
      done = true;
      store.commit(cs2);
    });
    store.commit(cs1);
    expect(seen).toEqual([
      ["first", cs1],
      ["second", cs1],
      ["first", cs2],
      ["second", cs2],
    ]);
    expect(store.getSnapshot().items.a.x).toBe(2);
  });

  it("a commit made inside onChange is delivered after the current change set", () => {
    const store = createStormStore({ body: board(), camera });
    const cs1: ChangeSet = { upsert: [sticky("a", { x: 1 })], delete: [] };
    const cs2: ChangeSet = { upsert: [sticky("a", { x: 2 })], delete: [] };
    const seen: [string, ChangeSet][] = [];
    store.onChange((cs) => {
      seen.push(["first", cs]);
      if (cs === cs1) store.commit(cs2);
    });
    store.onChange((cs) => seen.push(["second", cs]));
    let notified = 0;
    store.subscribe(() => notified++);
    store.commit(cs1);
    expect(seen).toEqual([
      ["first", cs1],
      ["second", cs1],
      ["first", cs2],
      ["second", cs2],
    ]);
    expect(notified).toBe(1);
    expect(store.getHistory().undo).toHaveLength(2);
  });

  it("deleting the edited sticky keeps the text edit as its own step", () => {
    const { store } = setup(board(sticky("a", { text: "hi" })));
    store.startEdit("a");
    store.setText("a", "hello");
    store.commit({ upsert: [], delete: ["a"] });
    expect(store.getSnapshot().editingId).toBeNull();
    expect(store.getHistory().undo).toHaveLength(2);
    store.undo();
    expect(store.getSnapshot().items.a.text).toBe("hello");
    store.undo();
    expect(store.getSnapshot().items.a.text).toBe("hi");
  });

  it("endEdit's undo reverts only the text", () => {
    const { store } = setup(board(sticky("a", { text: "hi", x: 0 })));
    store.startEdit("a");
    store.setText("a", "ho");
    store.commit({ upsert: [{ ...store.getSnapshot().items.a, x: 50 }], delete: [] }, "none");
    store.endEdit();
    store.undo();
    expect(store.getSnapshot().items.a).toMatchObject({ text: "hi", x: 50 });
  });

  it("setText ignores a sticky that is not being edited", () => {
    const { store, emitted } = setup(board(sticky("a", { text: "hi" })));
    store.setText("a", "nope");
    expect(store.getSnapshot().items.a.text).toBe("hi");
    expect(emitted).toEqual([]);
  });

  it("setCamera copies the camera", () => {
    const { store } = setup();
    const cam = { x: 1, y: 2, zoom: 1 };
    store.setCamera(cam);
    cam.x = 99;
    expect(store.getSnapshot().camera.x).toBe(1);
  });

  it("zoom is not undone", () => {
    const { store } = setup(board(sticky("a", { x: 0 })));
    store.commit({ upsert: [sticky("a", { x: 50 })], delete: [] });
    store.setCamera({ x: 3, y: 4, zoom: 2 });
    store.undo();
    expect(store.getSnapshot().items.a.x).toBe(0);
    expect(store.getSnapshot().camera).toEqual({ x: 3, y: 4, zoom: 2 });
  });

  it("undo during an open edit ends the edit and undoes it", () => {
    const { store } = setup(board(sticky("a", { text: "hi" })));
    store.startEdit("a");
    store.setText("a", "ho");
    store.undo();
    expect(store.getSnapshot().editingId).toBeNull();
    expect(store.getSnapshot().items.a.text).toBe("hi");
    expect(store.getSnapshot().canRedo).toBe(true);
  });

  it("startEdit selects the sticky", () => {
    const { store } = setup(board(sticky("a")));
    store.startEdit("a");
    expect(store.getSnapshot().selectedId).toBe("a");
  });

  it("select of an unknown id selects nothing", () => {
    const { store } = setup(board(sticky("a")));
    store.select("a");
    store.select("missing");
    expect(store.getSnapshot().selectedId).toBeNull();
  });

  it("unsubscribe stops notifications", () => {
    const store = createStormStore({ body: board(), camera });
    let n = 0;
    let c = 0;
    const off = store.subscribe(() => n++);
    const offChange = store.onChange(() => c++);
    off();
    offChange();
    store.commit({ upsert: [sticky("a")], delete: [] });
    expect(n).toBe(0);
    expect(c).toBe(0);
  });
});

describe("fitted size", () => {
  /** Every character is half the font size wide. */
  const measure: SizedMeasure = (s, px) => s.length * px * 0.5;
  const long = "word ".repeat(40).trim();

  it("setText stores the text and its fitted size in one commit", () => {
    const ID = "11111111-1111-4111-8111-111111111111";
    const { store, emitted } = setup(board(sticky(ID, { text: "hi", fontSize: 64 })));
    store.setMeasure(measure);
    store.startEdit(ID);
    store.setText(ID, long);
    const size = fitFontSize(measure, long, 200, 200);
    expect(size).toBeLessThan(64);
    expect(emitted).toEqual([{ upsert: [sticky(ID, { text: long, fontSize: size })], delete: [] }]);
    expect(store.getSnapshot().items[ID]).toEqual(sticky(ID, { text: long, fontSize: size }));
    expect(validateChangeSet(emitted[0]).ok).toBe(true);
  });

  it("undo restores the old text and size together; redo reapplies both", () => {
    const { store } = setup(board(sticky("a", { text: "hi", fontSize: 64 })));
    store.setMeasure(measure);
    store.startEdit("a");
    store.setText("a", "hi there");
    store.setText("a", long);
    store.endEdit();
    const after = store.getSnapshot().items.a;
    expect(store.getHistory().undo).toHaveLength(1);
    store.undo();
    expect(store.getSnapshot().items.a).toEqual(sticky("a", { text: "hi", fontSize: 64 }));
    store.redo();
    expect(store.getSnapshot().items.a).toEqual(after);
  });

  it("undo of an edit on a sticky with no stored size leaves it unsized", () => {
    const { store } = setup(board(sticky("a", { text: "hi" })));
    store.setMeasure(measure);
    store.startEdit("a");
    store.setText("a", long);
    store.endEdit();
    store.undo();
    expect(store.getSnapshot().items.a).toEqual(sticky("a", { text: "hi" }));
    expect("fontSize" in store.getSnapshot().items.a).toBe(false);
  });

  it("without a measure (font not loaded), setText stores the text without a size", () => {
    const { store, emitted } = setup(board(sticky("a", { text: "hi", fontSize: 64 })));
    store.startEdit("a");
    store.setText("a", long);
    expect(emitted).toEqual([{ upsert: [sticky("a", { text: long })], delete: [] }]);
    store.endEdit();
    store.undo();
    expect(store.getSnapshot().items.a).toEqual(sticky("a", { text: "hi", fontSize: 64 }));
  });

  it("loading a board and setting the measure writes nothing", () => {
    const { store, emitted } = setup(board(sticky("a", { text: "hi" })));
    store.setMeasure(measure);
    store.startEdit("a");
    store.endEdit();
    expect(emitted).toEqual([]);
    expect("fontSize" in store.getSnapshot().items.a).toBe(false);
  });

  it("empty text is stored at 64", () => {
    const { store } = setup(board(sticky("a", { text: "hi" })));
    store.setMeasure(measure);
    store.startEdit("a");
    store.setText("a", "");
    expect(store.getSnapshot().items.a).toMatchObject({ text: "", fontSize: 64 });
  });

  it("moving an unsized sticky stores its fitted size in the same change set, with no extra step", () => {
    const ID = "11111111-1111-4111-8111-111111111111";
    const { store, emitted } = setup(board(sticky(ID, { text: long })));
    store.setMeasure(measure);
    moveSticky(store, ID, 10, 10, "push");
    const size = fitFontSize(measure, long, 200, 200);
    expect(emitted).toHaveLength(1);
    expect(emitted[0].upsert).toEqual([sticky(ID, { text: long, x: 10, y: 10, fontSize: size })]);
    expect(validateChangeSet(emitted[0]).ok).toBe(true);
    expect(store.getHistory().undo).toHaveLength(1);
    store.undo();
    expect(store.getSnapshot().items[ID]).toEqual(sticky(ID, { text: long }));
  });

  it("a sticky with a stored size keeps it on a move", () => {
    const { store, emitted } = setup(board(sticky("a", { text: long, fontSize: 30 })));
    store.setMeasure(measure);
    moveSticky(store, "a", 10, 10, "push");
    expect(emitted[0].upsert[0].fontSize).toBe(30);
  });

  it("without a measure a move stores no size", () => {
    const { store, emitted } = setup(board(sticky("a", { text: long })));
    moveSticky(store, "a", 10, 10, "push");
    expect("fontSize" in emitted[0].upsert[0]).toBe(false);
  });

  it("setMeasure notifies, so an editor opened before the font loaded lays out again", () => {
    const { store, notified } = setup(board(sticky("a", { text: "hi" })));
    const before = notified();
    const snap = store.getSnapshot();
    store.setMeasure(measure);
    expect(notified()).toBe(before + 1);
    expect(store.getSnapshot()).not.toBe(snap);
  });

  it("text clamped on load drops its stored size, so it is fitted again", () => {
    const ID = "11111111-1111-4111-8111-111111111111";
    const store = createStormStore({ body: board(sticky(ID, { text: "x".repeat(600), fontSize: 8 })), camera });
    expect("fontSize" in store.getSnapshot().items[ID]).toBe(false);
  });
});

describe("removed colours on load", () => {
  const ID = "11111111-1111-4111-8111-111111111111";
  const ORANGE = "#FFDEB9";
  const LIGHT_YELLOW = "#FFF0A0";

  it("a loaded Orange sticky shows as Light yellow, keeps its size, and opening writes nothing", () => {
    for (const via of ["init", "replace"] as const) {
      const old = sticky(ID, { color: ORANGE, fontSize: 30 });
      const store =
        via === "init" ? createStormStore({ body: board(old), camera }) : createStormStore({ body: board(), camera });
      const emitted: ChangeSet[] = [];
      store.onChange((cs) => emitted.push(cs));
      if (via === "replace") store.replaceBoard(board(old));
      expect(store.getSnapshot().items[ID]).toEqual(sticky(ID, { color: LIGHT_YELLOW, fontSize: 30 }));
      expect(emitted).toEqual([]);
      expect(store.getHistory().undo).toHaveLength(0);
    }
  });

  it("its next move saves Light yellow, and the change set validates", () => {
    const { store, emitted } = setup(board(sticky(ID, { color: ORANGE, fontSize: 30 })));
    moveSticky(store, ID, 10, 0, "push");
    expect(emitted).toHaveLength(1);
    expect(emitted[0].upsert[0].color).toBe(LIGHT_YELLOW);
    expect(validateChangeSet(emitted[0]).ok).toBe(true);
  });

  it("maps Red and the earlier Pink to Pink, Brown to Light yellow; presets untouched", () => {
    const store = createStormStore({
      body: board(
        sticky("r", { color: "#FFD7CF" }),
        sticky("p", { color: "#FFD5EE" }),
        sticky("b", { color: "#E7CBB9" }),
        sticky("k", { color: "#141310" }),
        sticky("y"),
      ),
      camera,
    });
    const items = store.getSnapshot().items;
    expect([items.r.color, items.p.color, items.b.color, items.k.color, items.y.color]).toEqual([
      "#FFC6E8", "#FFC6E8", LIGHT_YELLOW, "#141310", undefined,
    ]);
  });

  it("a board with only current colours is kept as is", () => {
    const body = board(sticky("a", { color: "#D3A1FF" }), sticky("b"));
    expect(createStormStore({ body, camera }).getSnapshot().items).toBe(body.items);
  });
});

describe("restored history is brought up to today's rules", () => {
  const ID = "11111111-1111-4111-8111-111111111111";
  const ORANGE = "#FFDEB9";

  /** A store whose saved history holds one step that turned the sticky from `before` to `after`. */
  function restored(before: Sticky, after: Sticky) {
    const history = pushStep(EMPTY_HISTORY, {
      do: { upsert: [after], delete: [] },
      undo: { upsert: [before], delete: [] },
    });
    return createStormStore({ body: board(after), camera, history });
  }

  it("undo of a step saved with Orange gives a change set that validates (Light yellow)", () => {
    const store = restored(sticky(ID, { color: ORANGE, fontSize: 30 }), sticky(ID, { color: "#141310", fontSize: 30 }));
    const emitted: ChangeSet[] = [];
    store.onChange((cs) => emitted.push(cs));
    store.undo();
    expect(emitted[0].upsert[0]).toEqual(sticky(ID, { color: "#FFF0A0", fontSize: 30 }));
    expect(validateChangeSet(emitted[0]).ok).toBe(true);
    store.redo();
    expect(validateChangeSet(emitted[1]).ok).toBe(true);
  });

  it("redo of a step saved with Orange validates too", () => {
    const store = restored(sticky(ID, { fontSize: 30 }), sticky(ID, { color: ORANGE, fontSize: 30 }));
    const emitted: ChangeSet[] = [];
    store.onChange((cs) => emitted.push(cs));
    store.undo();
    store.redo();
    expect(emitted[1].upsert[0].color).toBe("#FFF0A0");
    expect(emitted.every((cs) => validateChangeSet(cs).ok)).toBe(true);
  });

  it("undo of a step saved with 600 characters is clamped to 500, its size dropped, and validates", () => {
    const store = restored(sticky(ID, { text: "x".repeat(600), fontSize: 8 }), sticky(ID, { text: "short", fontSize: 64 }));
    const emitted: ChangeSet[] = [];
    store.onChange((cs) => emitted.push(cs));
    store.undo();
    expect(emitted[0].upsert[0].text).toHaveLength(500);
    expect("fontSize" in emitted[0].upsert[0]).toBe(false);
    expect(validateChangeSet(emitted[0]).ok).toBe(true);
  });

  it("a history with nothing to fix is kept as is", () => {
    const history = pushStep(EMPTY_HISTORY, {
      do: { upsert: [sticky(ID, { color: "#141310" })], delete: [] },
      undo: { upsert: [sticky(ID)], delete: [] },
    });
    expect(createStormStore({ body: board(), camera, history }).getHistory()).toBe(history);
  });
});

describe("getHistoryForPersist", () => {
  it("is the history itself when no edit is open", () => {
    const { store } = setup();
    store.commit({ upsert: [sticky("a")], delete: [] });
    expect(store.getHistoryForPersist()).toBe(store.getHistory());
  });

  it("adds the open edit as a step, so a reload can undo and redo the typed text", () => {
    const { store } = setup();
    store.commit({ upsert: [sticky("a")], delete: [] });
    store.startEdit("a");
    store.setText("a", "Ideas");
    const persisted = store.getHistoryForPersist();
    expect(store.getHistory().undo).toHaveLength(1);
    expect(persisted.undo).toHaveLength(2);
    expect(persisted.undo[1]).toEqual({
      do: { upsert: [sticky("a", { text: "Ideas" })], delete: [] },
      undo: { upsert: [sticky("a", { text: "" })], delete: [] },
    });

    // Reload: the stored board has "Ideas" and the persisted history.
    const reloaded = createStormStore({ body: board(sticky("a", { text: "Ideas" })), camera, history: persisted });
    reloaded.undo();
    expect(reloaded.getSnapshot().items.a.text).toBe("");
    reloaded.redo();
    expect(reloaded.getSnapshot().items.a.text).toBe("Ideas");
    reloaded.undo();
    reloaded.undo();
    expect(reloaded.getSnapshot().items.a).toBeUndefined();
    reloaded.redo();
    reloaded.redo();
    expect(reloaded.getSnapshot().items.a.text).toBe("Ideas");
  });

  it("adds nothing for an open edit that has not changed the text", () => {
    const { store } = setup(board(sticky("a", { text: "hi" })));
    store.startEdit("a");
    store.setText("a", "ho");
    store.setText("a", "hi");
    expect(store.getHistoryForPersist().undo).toHaveLength(0);
  });

  it("clamps long sticky text on load and on replaceBoard, so later change sets validate", () => {
    for (const via of ["init", "replace"] as const) {
      const ID = "11111111-1111-4111-8111-111111111111";
      const long = sticky(ID, { text: "x".repeat(600) });
      const store =
        via === "init"
          ? createStormStore({ body: board(long), camera })
          : createStormStore({ body: board(), camera });
      if (via === "replace") store.replaceBoard(board(long));
      expect((store.getSnapshot().items[ID] as Sticky).text).toHaveLength(500);
      const emitted: ChangeSet[] = [];
      store.onChange((cs) => emitted.push(cs));
      moveSticky(store, ID, 10, 10, "push");
      expect(emitted).toHaveLength(1);
      expect(validateChangeSet(emitted[0]).ok).toBe(true);
    }
  });
});

describe("text cut inside a character", () => {
  const ID = "11111111-1111-4111-8111-111111111111";
  const tricky = "a".repeat(499) + "😀😀";

  it("setText drops half an emoji at the cut", () => {
    const { store } = setup(board(sticky(ID, { text: "hi" })));
    store.startEdit(ID);
    store.setText(ID, tricky);
    expect(store.getSnapshot().items[ID]).toMatchObject({ text: "a".repeat(499) });
  });

  it("normalising a board on load drops half an emoji at the cut", () => {
    const store = createStormStore({ body: board(sticky(ID, { text: tricky })), camera });
    expect((store.getSnapshot().items[ID] as Sticky).text).toBe("a".repeat(499));
  });
});

describe("setColor", () => {
  const PINK = "#FFC6E8";

  it("a colour change is one history step, emitted once", () => {
    const { store, emitted } = setup(board(sticky("a", { fontSize: 30 })));
    store.setColor("a", PINK);
    expect(store.getSnapshot().items.a.color).toBe(PINK);
    expect(store.getHistory().undo).toHaveLength(1);
    expect(emitted).toEqual([{ upsert: [sticky("a", { fontSize: 30, color: PINK })], delete: [] }]);
  });

  it("undo restores yellow (no stored colour); redo reapplies pink", () => {
    const { store } = setup(board(sticky("a", { fontSize: 30 })));
    store.setColor("a", PINK);
    store.undo();
    expect(store.getSnapshot().items.a).toEqual(sticky("a", { fontSize: 30 }));
    store.redo();
    expect(store.getSnapshot().items.a.color).toBe(PINK);
    expect(store.getHistory().undo).toHaveLength(1);
  });

  it("is a no-op when the colour is unchanged, including Yellow on a sticky with none", () => {
    const { store, emitted, notified } = setup(board(sticky("a"), sticky("b", { color: PINK })));
    store.setColor("a", "#F7D000");
    expect(notified()).toBe(0);
    store.setColor("b", PINK);
    expect(emitted).toEqual([]);
    expect(store.getHistory().undo).toHaveLength(0);
    // Picking the colour the sticky already has still makes it the colour for new stickies.
    expect(store.getSnapshot().creationColor).toBe(PINK);
  });

  it("sets the creation colour too (D8); undo leaves the creation colour alone", () => {
    const { store } = setup(board(sticky("a")));
    expect(store.getSnapshot().creationColor).toBe("#F7D000");
    store.setColor("a", PINK);
    expect(store.getSnapshot().creationColor).toBe(PINK);
    store.undo();
    expect(store.getSnapshot().creationColor).toBe(PINK);
  });

  it("ignores an unknown sticky and a colour that is not a preset", () => {
    const { store, emitted } = setup(board(sticky("a")));
    store.setColor("missing", PINK);
    store.setColor("a", "#123456");
    expect(emitted).toEqual([]);
  });

  it("the change set validates", () => {
    const ID = "11111111-1111-4111-8111-111111111111";
    const { store, emitted } = setup(board(sticky(ID, { fontSize: 64 })));
    store.setColor(ID, "#141310");
    expect(validateChangeSet(emitted[0]).ok).toBe(true);
  });
});

describe("creation colour", () => {
  it("starts Yellow, or as given when it is a preset", () => {
    expect(createStormStore({ body: board(), camera }).getSnapshot().creationColor).toBe("#F7D000");
    expect(createStormStore({ body: board(), camera, creationColor: "#D3A1FF" }).getSnapshot().creationColor).toBe("#D3A1FF");
    expect(createStormStore({ body: board(), camera, creationColor: "#123456" }).getSnapshot().creationColor).toBe("#F7D000");
  });

  it("setCreationColor: no history, no change set; notifies only on a change; presets only", () => {
    const { store, emitted, notified } = setup(board(sticky("a")));
    store.setCreationColor("#D4F3C4");
    expect(store.getSnapshot().creationColor).toBe("#D4F3C4");
    expect(notified()).toBe(1);
    store.setCreationColor("#D4F3C4");
    store.setCreationColor("#123456");
    expect(notified()).toBe(1);
    expect(store.getSnapshot().creationColor).toBe("#D4F3C4");
    expect(emitted).toEqual([]);
    expect(store.getHistory().undo).toHaveLength(0);
  });

  it("replaceBoard keeps it", () => {
    const store = createStormStore({ body: board(), camera, creationColor: "#D3A1FF" });
    store.replaceBoard(board(sticky("a")));
    expect(store.getSnapshot().creationColor).toBe("#D3A1FF");
  });
});

describe("panning", () => {
  it("setPanning changes the snapshot without history or emit, and only when it changes", () => {
    const { store, emitted, notified } = setup();
    expect(store.getSnapshot().panning).toBe(false);
    store.setPanning(true);
    store.setPanning(true);
    expect(store.getSnapshot().panning).toBe(true);
    expect(notified()).toBe(1);
    store.setPanning(false);
    expect(store.getSnapshot().panning).toBe(false);
    expect(emitted).toEqual([]);
    expect(store.getHistory().undo).toHaveLength(0);
  });
});
