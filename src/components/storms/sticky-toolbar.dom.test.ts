// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Sticky } from "@/lib/storms/model";
import { attachInput } from "./engine/input";
import { createStormStore, type StormStore } from "./engine/store";
import { placePalette, placeToolbar, StickyToolbar } from "./sticky-toolbar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const VP = { w: 800, h: 600 };
const TB = { w: 42, h: 42 };

describe("placeToolbar", () => {
  it("centres the toolbar 8 px above the sticky", () => {
    expect(placeToolbar({ x: 300, y: 200, w: 200, h: 200 }, TB, VP)).toEqual({
      left: 400 - 21,
      top: 200 - 8 - 42,
      side: "above",
    });
  });
  it("flips below the sticky when there is no room above", () => {
    expect(placeToolbar({ x: 300, y: 20, w: 200, h: 200 }, TB, VP)).toEqual({ left: 379, top: 228, side: "below" });
  });
  it("stays inside the board horizontally", () => {
    expect(placeToolbar({ x: -150, y: 200, w: 200, h: 200 }, TB, VP)?.left).toBe(8);
    expect(placeToolbar({ x: 750, y: 200, w: 200, h: 200 }, TB, VP)?.left).toBe(800 - 42 - 8);
  });
  it("is null when the sticky is out of view", () => {
    expect(placeToolbar({ x: 900, y: 200, w: 200, h: 200 }, TB, VP)).toBeNull();
    expect(placeToolbar({ x: 300, y: -300, w: 200, h: 200 }, TB, VP)).toBeNull();
  });
});

describe("placePalette", () => {
  const P = { w: 178, h: 178 };
  it("opens below a toolbar that sits above the sticky, centred on it", () => {
    expect(placePalette({ left: 379, top: 150, side: "above" }, TB, P, VP)).toEqual({ left: 400 - 89, top: 196 });
  });
  it("opens above a toolbar that sits below the sticky", () => {
    expect(placePalette({ left: 379, top: 400, side: "below" }, TB, P, VP)).toEqual({ left: 311, top: 400 - 4 - 178 });
  });
  it("flips when its side has no room, and stays inside the board horizontally", () => {
    expect(placePalette({ left: 8, top: 500, side: "above" }, TB, P, VP)).toEqual({ left: 8, top: 500 - 4 - 178 });
    expect(placePalette({ left: 8, top: 20, side: "below" }, TB, P, VP)).toEqual({ left: 8, top: 66 });
  });
});

const a: Sticky = { id: "a", type: "sticky", x: 0, y: 0, z: "a0", w: 200, h: 200, text: "hi", fontSize: 64 };

let surface: HTMLDivElement;
let board: HTMLDivElement;
let host: HTMLDivElement;
let root: Root;
let store: StormStore;
let detach: () => void;

beforeEach(() => {
  store = createStormStore({ body: { schema: 1, items: { a } }, camera: { x: 100, y: 100, zoom: 1 } });
  surface = document.createElement("div");
  surface.className = "light";
  board = document.createElement("div");
  board.tabIndex = 0;
  board.setPointerCapture = () => {};
  board.releasePointerCapture = () => {};
  board.hasPointerCapture = () => false;
  host = document.createElement("div");
  surface.append(board, host);
  document.body.append(surface);
  detach = attachInput(board, store, () => VP, surface);
  root = createRoot(host);
  act(() => root.render(createElement(StickyToolbar, { store, getViewport: () => VP })));
  board.focus();
});
afterEach(() => {
  act(() => root.unmount());
  detach();
  surface.remove();
});

const toolbar = () => host.querySelector<HTMLElement>('[role="toolbar"][aria-label="Sticky tools"]');
const colourButton = () => host.querySelector<HTMLButtonElement>('[aria-label^="Colour:"]')!;
const palette = () => host.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Sticky colour"]');
const swatch = (name: string) => host.querySelector<HTMLButtonElement>(`[role="radio"][aria-label="${name}"]`)!;
const keydown = (target: Element, key: string) =>
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
/** A mouse click as the browser sends it: pointerdown, mousedown (its default may move focus), click. */
function mouseClick(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0 }));
    const down = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    el.dispatchEvent(down);
    if (!down.defaultPrevented) el.focus();
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
  });
}
const select = (id: string | null) => act(() => store.select(id));

describe("StickyToolbar show and hide", () => {
  it("appears above the selected sticky and disappears when the selection is cleared", () => {
    expect(toolbar()).toBeNull();
    select("a");
    // Camera (100, 100) at zoom 1: the sticky's screen rect is (300, 200, 200, 200).
    expect(toolbar()?.style.left).toBe("379px");
    expect(toolbar()?.style.top).toBe("150px");
    expect(toolbar()?.dataset.side).toBe("above");
    expect(colourButton().getAttribute("aria-label")).toBe("Colour: Yellow");
    select(null);
    expect(toolbar()).toBeNull();
  });

  it("follows the sticky as the board pans and zooms", () => {
    select("a");
    act(() => store.setCamera({ x: 0, y: 100, zoom: 1 }));
    expect(toolbar()?.style.left).toBe("479px");
    act(() => store.setCamera({ x: 100, y: 100, zoom: 0.5 }));
    // Screen rect (350, 250, 100, 100).
    expect(toolbar()?.style.left).toBe("379px");
    expect(toolbar()?.style.top).toBe("200px");
  });

  it("is hidden while the sticky's text is edited, and back after", () => {
    select("a");
    act(() => store.startEdit("a"));
    expect(toolbar()).toBeNull();
    act(() => store.endEdit());
    expect(toolbar()).not.toBeNull();
  });

  it("is hidden while the sticky is dragged and while the board is panned", () => {
    select("a");
    act(() => store.setDragPreview({ id: "a", dx: 10, dy: 0 }));
    expect(toolbar()).toBeNull();
    act(() => store.setDragPreview(null));
    expect(toolbar()).not.toBeNull();
    act(() => store.setPanning(true));
    expect(toolbar()).toBeNull();
    act(() => store.setPanning(false));
    expect(toolbar()).not.toBeNull();
  });

  it("repositions when the board is resized", () => {
    let vp = { w: 800, h: 600 };
    act(() => root.render(createElement(StickyToolbar, { store, getViewport: () => vp, size: vp })));
    select("a");
    expect(toolbar()?.style.left).toBe("379px");
    vp = { w: 400, h: 600 };
    act(() => root.render(createElement(StickyToolbar, { store, getViewport: () => vp, size: vp })));
    // The camera is centred on the board, so the sticky (and the toolbar) moved with the new centre.
    expect(toolbar()?.style.left).toBe("179px");
  });

  it("sits in the board's light scope (stays light in the dark app theme)", () => {
    select("a");
    expect(toolbar()?.closest(".light")).toBe(surface);
  });
});

describe("StickyToolbar palette by keyboard", () => {
  it("Tab to Colour, Enter, arrows to Purple, Enter: purple, palette closed, focus back on Colour", () => {
    select("a");
    const button = colourButton();
    // Tab reaches it: a native button with no negative tabindex.
    expect(button.tagName).toBe("BUTTON");
    expect(button.tabIndex).toBeGreaterThanOrEqual(0);
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    act(() => button.focus());
    keydown(button, "Enter");
    expect(palette()).not.toBeNull();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    // Focus starts on the current colour.
    expect(document.activeElement).toBe(swatch("Yellow"));
    for (let i = 0; i < 5; i++) keydown(document.activeElement!, "ArrowRight");
    expect(document.activeElement).toBe(swatch("Purple"));
    keydown(document.activeElement!, "Enter");
    expect(store.getSnapshot().items.a.color).toBe("#D3A1FF");
    expect(palette()).toBeNull();
    expect(document.activeElement).toBe(colourButton());
    expect(colourButton().getAttribute("aria-label")).toBe("Colour: Purple");
  });

  it("arrows move by row and wrap; Space picks", () => {
    select("a");
    act(() => colourButton().focus());
    keydown(colourButton(), " ");
    keydown(document.activeElement!, "ArrowDown");
    expect(document.activeElement).toBe(swatch("Lavender"));
    keydown(document.activeElement!, "ArrowDown");
    expect(document.activeElement).toBe(swatch("Dark blue"));
    keydown(document.activeElement!, "ArrowLeft");
    expect(document.activeElement).toBe(swatch("Light blue"));
    keydown(swatch("Yellow"), "ArrowLeft");
    expect(document.activeElement).toBe(swatch("White"));
    keydown(document.activeElement!, " ");
    expect(store.getSnapshot().items.a.color).toBe("#FFFFFF");
  });

  it("Esc closes without a change and returns focus to Colour", () => {
    select("a");
    act(() => colourButton().focus());
    keydown(colourButton(), "Enter");
    keydown(document.activeElement!, "ArrowRight");
    keydown(document.activeElement!, "Escape");
    expect(palette()).toBeNull();
    expect(document.activeElement).toBe(colourButton());
    expect(store.getSnapshot().items.a.color).toBeUndefined();
    expect(store.getHistory().undo).toHaveLength(0);
  });

  it("every swatch has its colour's name; the current colour is checked and marked", () => {
    act(() => store.commit({ upsert: [{ ...a, color: "#FFC6E8" }], delete: [] }, "none"));
    select("a");
    act(() => colourButton().focus());
    keydown(colourButton(), "Enter");
    const radios = [...host.querySelectorAll('[role="radio"]')];
    expect(radios.map((r) => r.getAttribute("aria-label"))).toEqual([
      "Yellow", "Light yellow", "Pink", "Magenta", "Lavender", "Purple", "Sky blue",
      "Light blue", "Dark blue", "Light green", "Dark green", "Black", "White",
    ]);
    // 4 per row (D5).
    expect(palette()!.className).toContain("grid-cols-4");
    expect(radios.map((r) => r.getAttribute("title"))).toEqual(radios.map((r) => r.getAttribute("aria-label")));
    expect(radios.filter((r) => r.getAttribute("aria-checked") === "true")).toEqual([swatch("Pink")]);
    expect(swatch("Pink").querySelector("svg")).not.toBeNull();
    expect(swatch("Yellow").querySelector("svg")).toBeNull();
    // Roving focus: only the focused swatch is in the Tab order.
    expect(radios.filter((r) => (r as HTMLElement).tabIndex === 0)).toEqual([swatch("Pink")]);
  });

  it("Tab out of the palette closes it", () => {
    select("a");
    act(() => colourButton().focus());
    keydown(colourButton(), "Enter");
    const outside = document.createElement("button");
    document.body.append(outside);
    act(() => {
      swatch("Yellow").dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: outside }));
      outside.focus();
    });
    expect(palette()).toBeNull();
    outside.remove();
  });
});

describe("StickyToolbar with the mouse", () => {
  it("a click on Colour and on a swatch keeps the sticky selected, doesn't pan, and saves one step", () => {
    select("a");
    const camera = store.getSnapshot().camera;
    const emitted: unknown[] = [];
    store.onChange((cs) => emitted.push(cs));
    mouseClick(colourButton());
    expect(palette()).not.toBeNull();
    mouseClick(swatch("Pink"));
    const snap = store.getSnapshot();
    expect(snap.selectedId).toBe("a");
    expect(snap.items.a.color).toBe("#FFC6E8");
    expect(snap.camera).toBe(camera);
    expect(snap.panning).toBe(false);
    expect(emitted).toHaveLength(1);
    expect(store.getHistory().undo).toHaveLength(1);
    expect(palette()).toBeNull();
    // The board keeps keyboard focus, so Ctrl+Z undoes straight away.
    expect(document.activeElement).toBe(board);
    act(() => {
      board.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true }));
    });
    expect(store.getSnapshot().items.a.color).toBeUndefined();
  });

  it("a press outside the toolbar closes the palette", () => {
    select("a");
    mouseClick(colourButton());
    act(() => {
      document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    expect(palette()).toBeNull();
  });

  it("Esc closes a palette opened with the mouse", () => {
    select("a");
    mouseClick(colourButton());
    keydown(board, "Escape");
    expect(palette()).toBeNull();
  });

  const boardKey = (k: string) => {
    const e = new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true });
    act(() => {
      board.dispatchEvent(e);
    });
  };

  it("an arrow while the palette is open by mouse moves focus into it, not the sticky", () => {
    select("a");
    mouseClick(colourButton());
    expect(document.activeElement).toBe(board);
    boardKey("ArrowRight");
    expect(document.activeElement).toBe(swatch("Light yellow"));
    expect(store.getSnapshot().items.a.x).toBe(0);
  });

  it("Delete, N and Enter do not reach the board while the palette is open", () => {
    select("a");
    mouseClick(colourButton());
    boardKey("Delete");
    boardKey("Backspace");
    boardKey("n");
    expect(store.getSnapshot().items.a).toBeDefined();
    expect(store.getSnapshot().tool).toBe("select");
    expect(palette()).not.toBeNull();
    boardKey("Enter");
    expect(store.getSnapshot().editingId).toBeNull();
  });

  it("Ctrl/Cmd+C, V and D are held back while the palette is open (no copy, paste, duplicate or bookmarks)", () => {
    select("a");
    mouseClick(colourButton());
    // A prevented Ctrl+C or V keydown stops the browser from firing copy or paste.
    for (const key of ["c", "v", "d"])
      for (const init of [{ ctrlKey: true }, { metaKey: true }]) {
        const e = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
        act(() => {
          board.dispatchEvent(e);
        });
        expect(e.defaultPrevented).toBe(true);
      }
    expect(Object.keys(store.getSnapshot().items)).toEqual(["a"]);
    expect(palette()).not.toBeNull();
  });

  it("Delete on a swatch does not delete the sticky", () => {
    select("a");
    mouseClick(colourButton());
    keydown(board, "ArrowRight");
    keydown(document.activeElement!, "Delete");
    expect(store.getSnapshot().items.a).toBeDefined();
  });

  it("Esc after a mouse open and an arrow returns focus to Colour", () => {
    select("a");
    mouseClick(colourButton());
    keydown(board, "ArrowRight");
    keydown(document.activeElement!, "Escape");
    expect(palette()).toBeNull();
    expect(document.activeElement).toBe(colourButton());
  });

  it("Esc in the palette closes it and leaves the active tool alone", () => {
    select("a");
    act(() => store.setTool("sticky"));
    mouseClick(colourButton());
    keydown(board, "Escape");
    expect(palette()).toBeNull();
    expect(store.getSnapshot().tool).toBe("sticky");
  });

  it("the wheel over the toolbar still zooms the board", () => {
    select("a");
    const zoom = store.getSnapshot().camera.zoom;
    const w = new WheelEvent("wheel", { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true });
    act(() => {
      toolbar()!.dispatchEvent(w);
    });
    expect(w.defaultPrevented).toBe(true);
    expect(store.getSnapshot().camera.zoom).toBeGreaterThan(zoom);
  });
});
