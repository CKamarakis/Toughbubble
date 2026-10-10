import { describe, expect, it } from "vitest";
import type { ChangeSet } from "@/lib/storms/changeset";
import { pushStep, EMPTY_HISTORY } from "@/lib/storms/history";
import type { Sticky, StormBody } from "@/lib/storms/model";
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
