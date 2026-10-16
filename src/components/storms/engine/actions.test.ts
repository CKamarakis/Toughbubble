import { describe, expect, it } from "vitest";
import { BOARD_LIMIT } from "@/lib/storms/limits";
import type { Sticky, StormBody } from "@/lib/storms/model";
import { deleteSelected, moveSticky, nudge, placeSticky } from "./actions";
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
const make = (...items: Sticky[]) =>
  createStormStore({
    body: { schema: 1, items: Object.fromEntries(items.map((i) => [i.id, i])) } as StormBody,
    camera: { x: 0, y: 0, zoom: 1 },
  });

describe("placeSticky", () => {
  it("centres a 200x200 sticky on top and selects it", () => {
    const store = make(sticky("a"));
    store.setTool("sticky");
    const id = placeSticky(store, { x: 500, y: 300 });
    const s = store.getSnapshot();
    expect(s.items[id]).toMatchObject({ x: 400, y: 200, w: 200, h: 200, text: "", type: "sticky" });
    expect(s.items[id].z > s.items.a.z).toBe(true);
    expect(s.selectedId).toBe(id);
    expect(s.tool).toBe("select");
    expect(store.getHistory().undo).toHaveLength(1);
  });

  it("a new sticky is pink after another was turned pink (the creation colour, D8)", () => {
    const store = make(sticky("a"));
    store.setColor("a", "#FFC6E8");
    const id = placeSticky(store, { x: 500, y: 300 });
    expect(store.getSnapshot().items[id].color).toBe("#FFC6E8");
    expect(store.getHistory().undo).toHaveLength(2);
  });

  it("a new sticky in the default Yellow stores no colour", () => {
    const store = make();
    const id = placeSticky(store, { x: 0, y: 0 });
    expect("color" in store.getSnapshot().items[id]).toBe(false);
  });

  it("uses a creation colour picked without recolouring anything", () => {
    const store = make();
    store.setCreationColor("#D4F3C4");
    const id = placeSticky(store, { x: 0, y: 0 });
    expect(store.getSnapshot().items[id].color).toBe("#D4F3C4");
  });

  it("near the limit stays inside it", () => {
    const store = make();
    const a = placeSticky(store, { x: BOARD_LIMIT * 2, y: -BOARD_LIMIT * 2 });
    const it = store.getSnapshot().items[a];
    expect(it.x + it.w).toBe(BOARD_LIMIT);
    expect(it.y).toBe(-BOARD_LIMIT);
  });
});

describe("nudge", () => {
  const sel = () => {
    const store = make(sticky("a"));
    store.select("a");
    return store;
  };
  it("two nudges 500 ms apart make one undo step", () => {
    const store = sel();
    nudge(store, 1, 0, 1000);
    nudge(store, 1, 0, 1500);
    expect(store.getSnapshot().items.a.x).toBe(2);
    expect(store.getHistory().undo).toHaveLength(1);
    store.undo();
    expect(store.getSnapshot().items.a.x).toBe(0);
  });
  it("two nudges 1,500 ms apart make two steps", () => {
    const store = sel();
    nudge(store, 1, 0, 1000);
    nudge(store, 1, 0, 2500);
    expect(store.getHistory().undo).toHaveLength(2);
  });
  it("does not merge across another commit or an undo", () => {
    const store = sel();
    nudge(store, 1, 0, 1000);
    moveSticky(store, "a", 0, 5, "push");
    nudge(store, 1, 0, 1100);
    expect(store.getHistory().undo).toHaveLength(3);
    store.undo();
    nudge(store, 1, 0, 1200);
    expect(store.getHistory().undo).toHaveLength(3);
  });
  it("does nothing without a selection", () => {
    const store = make(sticky("a"));
    nudge(store, 1, 0, 0);
    expect(store.getHistory().undo).toHaveLength(0);
  });
});

describe("moveSticky", () => {
  it("a drag is one undo step", () => {
    const store = make(sticky("a"));
    store.setDragPreview({ id: "a", dx: 30, dy: 40 });
    store.setDragPreview(null);
    moveSticky(store, "a", 30, 40, "push");
    expect(store.getSnapshot().items.a).toMatchObject({ x: 30, y: 40 });
    expect(store.getSnapshot().dragPreview).toBeNull();
    expect(store.getHistory().undo).toHaveLength(1);
    store.undo();
    expect(store.getSnapshot().items.a).toMatchObject({ x: 0, y: 0 });
  });
});

describe("deleteSelected", () => {
  it("deleteSelected removes the sticky and is undoable", () => {
    const store = make(sticky("a", { text: "hi" }), sticky("b"));
    store.select("a");
    deleteSelected(store);
    expect(store.getSnapshot().items.a).toBeUndefined();
    expect(store.getSnapshot().items.b).toBeDefined();
    expect(store.getSnapshot().selectedId).toBeNull();
    expect(store.getHistory().undo).toHaveLength(1);
    store.undo();
    expect(store.getSnapshot().items.a).toMatchObject({ text: "hi" });
  });

  it("deleteSelected with nothing selected does nothing", () => {
    const store = make(sticky("a"));
    deleteSelected(store);
    expect(store.getSnapshot().items.a).toBeDefined();
    expect(store.getHistory().undo).toHaveLength(0);
  });
});
