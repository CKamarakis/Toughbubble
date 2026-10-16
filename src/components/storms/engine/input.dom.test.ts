// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOME_CAMERA } from "@/lib/storms/camera";
import type { Item } from "@/lib/storms/model";
import { attachInput } from "./input";
import { createStormStore, type StormStore } from "./store";

const VP = { w: 800, h: 600 };
const item = { id: "a", x: 1000, y: 1000, w: 200, h: 200, text: "", color: "yellow" } as unknown as Item;

let el: HTMLDivElement;
let store: StormStore;
let detach: () => void;

function setup(withItem = false) {
  store = createStormStore({
    body: { items: withItem ? { a: item } : {} } as never,
    camera: { ...HOME_CAMERA },
  });
  detach = attachInput(el, store, () => VP);
}

const key = (target: EventTarget, init: KeyboardEventInit) => {
  const e = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(e);
  return e;
};
const shift1 = { key: "!", code: "Digit1", shiftKey: true };
const cursor = () => el.style.cursor;

beforeEach(() => {
  el = document.createElement("div");
  el.tabIndex = 0;
  document.body.appendChild(el);
  el.focus();
});
afterEach(() => {
  detach?.();
  el.remove();
});

describe("attachInput DOM handlers", () => {
  it("prevents default on wheel and contextmenu", () => {
    setup();
    const w = new WheelEvent("wheel", { deltaY: 100, cancelable: true, bubbles: true });
    el.dispatchEvent(w);
    expect(w.defaultPrevented).toBe(true);
    const c = new Event("contextmenu", { cancelable: true, bubbles: true });
    el.dispatchEvent(c);
    expect(c.defaultPrevented).toBe(true);
  });

  it("Ctrl+wheel over an overlay on the surface zooms the board, not the page", () => {
    const surface = document.createElement("div");
    document.body.appendChild(surface);
    surface.appendChild(el);
    const ta = document.createElement("textarea");
    surface.appendChild(ta);
    store = createStormStore({ body: { items: {} } as never, camera: { ...HOME_CAMERA } });
    detach = attachInput(el, store, () => VP, surface);
    const zoomIn = () =>
      new WheelEvent("wheel", { deltaY: -100, ctrlKey: true, cancelable: true, bubbles: true });
    const w = zoomIn();
    ta.dispatchEvent(w);
    expect(w.defaultPrevented).toBe(true);
    expect(store.getSnapshot().camera.zoom).toBeGreaterThan(1);
    detach();
    const zoom = store.getSnapshot().camera.zoom;
    ta.dispatchEvent(zoomIn());
    expect(store.getSnapshot().camera.zoom).toBe(zoom);
    surface.remove();
  });

  it("detach removes listeners", () => {
    setup(true);
    detach();
    const before = store.getSnapshot().camera;
    el.dispatchEvent(new WheelEvent("wheel", { deltaY: -300, deltaMode: 1, cancelable: true }));
    key(el, shift1);
    key(el, { key: " " });
    expect(store.getSnapshot().camera).toEqual(before);
    expect(cursor()).toBe("");
  });

  it("Space shows grab, window keyup ends it", () => {
    setup();
    const e = key(el, { key: " " });
    expect(e.defaultPrevented).toBe(true);
    expect(cursor()).toBe("grab");
    window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
    expect(cursor()).toBe("");
  });

  it("blur ends Space panning", () => {
    setup();
    key(el, { key: " " });
    expect(cursor()).toBe("grab");
    el.blur();
    expect(cursor()).toBe("");
  });

  it("ignores Space while editing", () => {
    setup(true);
    store.startEdit("a");
    const e = key(el, { key: " " });
    expect(e.defaultPrevented).toBe(false);
    expect(cursor()).toBe("");
  });

  it("ignores Shift+1 and Ctrl+= while editing", () => {
    setup(true);
    store.startEdit("a");
    const before = store.getSnapshot().camera;
    const e1 = key(el, shift1);
    const e2 = key(el, { key: "=", ctrlKey: true });
    expect(store.getSnapshot().camera).toEqual(before);
    expect(e1.defaultPrevented).toBe(false);
    expect(e2.defaultPrevented).toBe(false);
  });

  it("ignores keys from a textarea inside the board", () => {
    setup(true);
    const ta = document.createElement("textarea");
    el.appendChild(ta);
    ta.focus();
    const before = store.getSnapshot().camera;
    const e = key(ta, shift1);
    expect(e.defaultPrevented).toBe(false);
    expect(store.getSnapshot().camera).toEqual(before);
  });

  it("Shift+1 fits items when not editing, and Ctrl+= is prevented", () => {
    setup(true);
    const e = key(el, shift1);
    expect(e.defaultPrevented).toBe(true);
    expect(store.getSnapshot().camera.x).toBe(1100);
    expect(key(el, { key: "=", ctrlKey: true }).defaultPrevented).toBe(true);
  });

  it("N picks the sticky tool, Esc turns it off and V does nothing", () => {
    setup();
    expect(key(el, { key: "n", code: "KeyN" }).defaultPrevented).toBe(true);
    expect(store.getSnapshot().tool).toBe("sticky");
    key(el, { key: "V", code: "KeyV" });
    expect(store.getSnapshot().tool).toBe("sticky");
    key(el, { key: "Escape", code: "Escape" });
    expect(store.getSnapshot().tool).toBe("select");
  });

  it("tool keys ignore modifiers", () => {
    setup();
    key(el, { key: "n", code: "KeyN", ctrlKey: true });
    key(el, { key: "n", code: "KeyN", metaKey: true });
    key(el, { key: "n", code: "KeyN", altKey: true });
    expect(store.getSnapshot().tool).toBe("select");
  });

  it("tool keys are ignored while editing and in a textarea", () => {
    setup(true);
    const ta = document.createElement("textarea");
    el.appendChild(ta);
    ta.focus();
    key(ta, { key: "n", code: "KeyN" });
    expect(store.getSnapshot().tool).toBe("select");
    el.focus();
    store.startEdit("a");
    key(el, { key: "n", code: "KeyN" });
    expect(store.getSnapshot().tool).toBe("select");
  });
});

const ptr = (type: string, init: PointerEventInit = {}) => {
  const e = new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, button: 0, ...init });
  el.dispatchEvent(e);
  return e;
};
// Board point (bx, by) shows at screen (bx, by) at the home camera: the camera
// centre is the viewport centre, so board (0,0) is at (400, 300).
const at = (bx: number, by: number) => ({ clientX: 400 + bx, clientY: 300 + by });

describe("attachInput item interactions", () => {
  beforeEach(() => {
    el.setPointerCapture = () => {};
    el.releasePointerCapture = () => {};
    el.hasPointerCapture = () => false;
    el.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 5000, bottom: 5000, width: 5000, height: 5000 }) as DOMRect;
  });

  it("sticky tool + click places a sticky, even over another", () => {
    setup(true);
    store.setTool("sticky");
    ptr("pointerdown", at(1100, 1100));
    ptr("pointerup", at(1100, 1100));
    expect(Object.values(store.getSnapshot().items)).toHaveLength(2);
    expect(store.getSnapshot().tool).toBe("select");
    expect(store.getSnapshot().selectedId).not.toBe("a");
  });

  it("select click selects, empty click deselects, no commit", () => {
    setup(true);
    ptr("pointerdown", at(1100, 1100));
    ptr("pointerup", at(1100, 1100));
    expect(store.getSnapshot().selectedId).toBe("a");
    expect(store.getHistory().undo).toHaveLength(0);
    ptr("pointerdown", at(0, 0));
    ptr("pointerup", at(0, 0));
    expect(store.getSnapshot().selectedId).toBeNull();
  });

  it("drag moves with a preview and one undo step; nothing before 3 px", () => {
    setup(true);
    ptr("pointerdown", at(1100, 1100));
    ptr("pointermove", at(1102, 1100));
    expect(store.getSnapshot().dragPreview).toBeNull();
    ptr("pointermove", at(1150, 1130));
    expect(store.getSnapshot().dragPreview).toEqual({ id: "a", dx: 50, dy: 30 });
    expect(store.getHistory().undo).toHaveLength(0);
    ptr("pointerup", at(1150, 1130));
    expect(store.getSnapshot().dragPreview).toBeNull();
    expect(store.getSnapshot().items.a).toMatchObject({ x: 1050, y: 1030 });
    expect(store.getHistory().undo).toHaveLength(1);
  });

  it("pointercancel clears the preview without committing", () => {
    setup(true);
    ptr("pointerdown", at(1100, 1100));
    ptr("pointermove", at(1150, 1130));
    ptr("pointercancel", at(1150, 1130));
    expect(store.getSnapshot().dragPreview).toBeNull();
    expect(store.getSnapshot().items.a.x).toBe(1000);
    expect(store.getHistory().undo).toHaveLength(0);
  });

  it("replacing the board cancels an item drag in progress", () => {
    setup(true);
    ptr("pointerdown", at(1100, 1100));
    ptr("pointermove", at(1150, 1130));
    store.replaceBoard({ schema: 1, items: { a: item } } as never);
    expect(store.getSnapshot().dragPreview).toBeNull();
    ptr("pointermove", at(1170, 1140));
    expect(store.getSnapshot().dragPreview).toBeNull();
    ptr("pointerup", at(1170, 1140));
    expect(store.getSnapshot().items.a.x).toBe(1000);
    expect(store.getHistory().undo).toHaveLength(0);
  });

  it("a pan drag (right button, or Space + left) sets panning until it ends", () => {
    setup(true);
    expect(store.getSnapshot().panning).toBe(false);
    ptr("pointerdown", { ...at(0, 0), button: 2 });
    expect(store.getSnapshot().panning).toBe(true);
    ptr("pointermove", { ...at(50, 0), button: 2 });
    ptr("pointerup", { ...at(50, 0), button: 2 });
    expect(store.getSnapshot().panning).toBe(false);
    key(el, { key: " " });
    ptr("pointerdown", at(0, 0));
    expect(store.getSnapshot().panning).toBe(true);
    ptr("pointercancel", at(0, 0));
    expect(store.getSnapshot().panning).toBe(false);
    window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
  });

  it("Space takes precedence over select/drag; other buttons do not select", () => {
    setup(true);
    key(el, { key: " " });
    ptr("pointerdown", at(1100, 1100));
    expect(store.getSnapshot().selectedId).toBeNull();
    ptr("pointerup", at(1100, 1100));
    window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
    ptr("pointerdown", { ...at(1100, 1100), button: 1 });
    expect(store.getSnapshot().selectedId).toBeNull();
  });

  it("arrows nudge 1 px, Shift 10 px, merged; only with a selection", () => {
    setup(true);
    expect(key(el, { key: "ArrowRight" }).defaultPrevented).toBe(false);
    store.select("a");
    expect(key(el, { key: "ArrowRight" }).defaultPrevented).toBe(true);
    key(el, { key: "ArrowDown", shiftKey: true });
    expect(store.getSnapshot().items.a).toMatchObject({ x: 1001, y: 1010 });
    expect(store.getHistory().undo).toHaveLength(1);
  });

  it("arrows are ignored with the sticky tool or while editing", () => {
    setup(true);
    store.select("a");
    store.setTool("sticky");
    key(el, { key: "ArrowLeft" });
    store.setTool("select");
    store.startEdit("a");
    key(el, { key: "ArrowLeft" });
    expect(store.getSnapshot().items.a.x).toBe(1000);
  });

  it("Delete and Backspace delete the selection as one undo step", () => {
    setup(true);
    store.select("a");
    expect(key(el, { key: "Delete" }).defaultPrevented).toBe(true);
    expect(store.getSnapshot().items.a).toBeUndefined();
    store.undo();
    store.select("a");
    expect(key(el, { key: "Backspace" }).defaultPrevented).toBe(true);
    expect(store.getSnapshot().items.a).toBeUndefined();
    expect(store.getHistory().undo).toHaveLength(1);
  });

  it("Backspace while editing does not delete the sticky", () => {
    setup(true);
    store.startEdit("a");
    expect(key(el, { key: "Backspace" }).defaultPrevented).toBe(false);
    expect(store.getSnapshot().items.a).toBeDefined();
  });

  it("Enter on a selected sticky starts editing", () => {
    setup(true);
    key(el, { key: "Enter" });
    expect(store.getSnapshot().editingId).toBeNull();
    store.select("a");
    expect(key(el, { key: "Enter" }).defaultPrevented).toBe(true);
    expect(store.getSnapshot().editingId).toBe("a");
  });

  it("double-click on a sticky with the Select tool starts editing", () => {
    setup(true);
    el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, ...at(0, 0) }));
    expect(store.getSnapshot().editingId).toBeNull();
    store.setTool("sticky");
    el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, ...at(1100, 1100) }));
    expect(store.getSnapshot().editingId).toBeNull();
    store.setTool("select");
    el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, ...at(1100, 1100) }));
    expect(store.getSnapshot().editingId).toBe("a");
    expect(store.getSnapshot().selectedId).toBe("a");
  });

  it("pointerdown on the board finishes editing with one undo step", () => {
    setup(true);
    store.startEdit("a");
    store.setText("a", "Ideas");
    ptr("pointerdown", at(0, 0));
    ptr("pointerup", at(0, 0));
    expect(store.getSnapshot().editingId).toBeNull();
    expect(store.getSnapshot().items.a.text).toBe("Ideas");
    expect(store.getHistory().undo).toHaveLength(1);
  });

  it("Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z and Ctrl+Y redo", () => {
    setup(true);
    store.select("a");
    key(el, { key: "Delete" });
    expect(key(el, { key: "z", ctrlKey: true }).defaultPrevented).toBe(true);
    expect(store.getSnapshot().items.a).toBeDefined();
    key(el, { key: "Z", metaKey: true, shiftKey: true });
    expect(store.getSnapshot().items.a).toBeUndefined();
    key(el, { key: "z", metaKey: true });
    key(el, { key: "y", ctrlKey: true });
    expect(store.getSnapshot().items.a).toBeUndefined();
  });

  it("Ctrl+D duplicates 20 px to the right with one undo step and prevents the bookmark default", () => {
    setup(true);
    store.select("a");
    expect(key(el, { key: "d", ctrlKey: true }).defaultPrevented).toBe(true);
    const s = store.getSnapshot();
    const id = s.selectedId!;
    expect(id).not.toBe("a");
    expect(s.items[id]).toMatchObject({ x: 1220, y: 1000, w: 200, h: 200 });
    expect(store.getHistory().undo).toHaveLength(1);
    store.undo();
    expect(Object.keys(store.getSnapshot().items)).toEqual(["a"]);
  });

  it("Ctrl+D with nothing selected or while editing does nothing and keeps the default", () => {
    setup(true);
    expect(key(el, { key: "d", ctrlKey: true }).defaultPrevented).toBe(false);
    store.startEdit("a");
    expect(key(el, { key: "d", ctrlKey: true }).defaultPrevented).toBe(false);
    expect(Object.keys(store.getSnapshot().items)).toEqual(["a"]);
  });
});

describe("edge auto-pan while dragging a sticky", () => {
  const centred = { id: "c", x: -100, y: -100, w: 200, h: 200, text: "", color: "yellow" } as unknown as Item;
  let queue: FrameRequestCallback[];
  let now = 1000;
  /** Runs the queued frames, `dt` ms after the previous one (default 60 Hz). */
  const frame = (dt = 1000 / 60) => {
    now += dt;
    const run = queue;
    queue = [];
    run.forEach((cb) => cb(now));
  };

  beforeEach(() => {
    queue = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => queue.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {
      queue = [];
    });
    el.setPointerCapture = () => {};
    el.releasePointerCapture = () => {};
    el.hasPointerCapture = () => false;
    el.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 }) as DOMRect;
    store = createStormStore({ body: { items: { c: centred } } as never, camera: { ...HOME_CAMERA } });
    detach = attachInput(el, store, () => VP);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("dragging into the left edge zone pans the camera and the sticky stays under the pointer", () => {
    ptr("pointerdown", at(0, 0));
    ptr("pointermove", { clientX: 10, clientY: 300 });
    expect(store.getSnapshot().dragPreview).toEqual({ id: "c", dx: -390, dy: 0 });
    frame();
    // 10 px from the edge: (40 - 10) / 40 * 15 = 11.25 px per frame; the view moves left.
    expect(store.getSnapshot().camera.x).toBeCloseTo(-11.25);
    expect(store.getSnapshot().dragPreview!.dx).toBeCloseTo(-401.25);
    frame();
    expect(store.getSnapshot().camera.x).toBeCloseTo(-22.5);
    // Still one undo step, committed at the drop position.
    expect(store.getHistory().undo).toHaveLength(0);
    ptr("pointerup", { clientX: 10, clientY: 300 });
    expect(store.getSnapshot().items.c.x).toBeCloseTo(-100 - 412.5);
    expect(store.getHistory().undo).toHaveLength(1);
    frame();
    expect(store.getSnapshot().camera.x).toBeCloseTo(-22.5);
  });

  it("pans the same distance per second at any refresh rate, and clamps a stalled frame", () => {
    ptr("pointerdown", at(0, 0));
    ptr("pointermove", { clientX: 10, clientY: 300 });
    frame(); // first frame: a full 60 Hz step (11.25 px)
    expect(store.getSnapshot().camera.x).toBeCloseTo(-11.25);
    frame(1000 / 120); // 120 Hz: half a step
    expect(store.getSnapshot().camera.x).toBeCloseTo(-11.25 - 5.625);
    frame(1000 / 30); // 30 Hz: two steps
    expect(store.getSnapshot().camera.x).toBeCloseTo(-11.25 - 5.625 - 22.5);
    frame(2000); // stalled: clamped to 50 ms = three steps
    expect(store.getSnapshot().camera.x).toBeCloseTo(-11.25 - 5.625 - 22.5 - 33.75);
  });

  it("stops when the pointer leaves the zone and on cancel", () => {
    ptr("pointerdown", at(0, 0));
    ptr("pointermove", { clientX: 10, clientY: 300 });
    frame();
    ptr("pointermove", { clientX: 400, clientY: 300 });
    const x = store.getSnapshot().camera.x;
    frame();
    expect(store.getSnapshot().camera.x).toBe(x);
    ptr("pointermove", { clientX: 10, clientY: 300 });
    ptr("pointercancel", { clientX: 10, clientY: 300 });
    frame();
    expect(store.getSnapshot().camera.x).toBe(x);
    expect(store.getHistory().undo).toHaveLength(0);
  });

  it("detach cancels the pan loop", () => {
    ptr("pointerdown", at(0, 0));
    ptr("pointermove", { clientX: 10, clientY: 300 });
    detach();
    frame();
    expect(store.getSnapshot().camera.x).toBe(0);
  });

  it.each([
    ["lostpointercapture", () => ptr("lostpointercapture", { clientX: 10, clientY: 300 })],
    ["window blur", () => window.dispatchEvent(new Event("blur"))],
  ])("%s ends an item drag: no more panning, preview cleared, no commit", (_name, lose) => {
    ptr("pointerdown", at(0, 0));
    ptr("pointermove", { clientX: 10, clientY: 300 });
    frame();
    const x = store.getSnapshot().camera.x;
    expect(x).not.toBe(0);
    lose();
    expect(store.getSnapshot().dragPreview).toBeNull();
    frame();
    frame();
    expect(store.getSnapshot().camera.x).toBe(x);
    expect(queue).toHaveLength(0);
    expect(store.getHistory().undo).toHaveLength(0);
    expect(store.getSnapshot().items.c.x).toBe(-100);
  });

  it.each([
    ["lostpointercapture", () => ptr("lostpointercapture", { button: 2 })],
    ["window blur", () => window.dispatchEvent(new Event("blur"))],
  ])("%s ends a right-button pan", (_name, lose) => {
    ptr("pointerdown", { button: 2, clientX: 100, clientY: 100 });
    ptr("pointermove", { button: 2, clientX: 150, clientY: 100 });
    const x = store.getSnapshot().camera.x;
    expect(x).toBe(-50);
    lose();
    ptr("pointermove", { button: 2, clientX: 300, clientY: 100 });
    expect(store.getSnapshot().camera.x).toBe(x);
  });

  it("detach removes the lost-pointer listeners", () => {
    ptr("pointerdown", at(0, 0));
    ptr("pointermove", { clientX: 10, clientY: 300 });
    const spy = vi.spyOn(store, "setDragPreview");
    detach();
    spy.mockClear();
    window.dispatchEvent(new Event("blur"));
    ptr("lostpointercapture");
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("copy and paste on the board", () => {
  const TYPE = "application/x-toughbubble-sticky+json";
  const PINK = "#FFC6E8";
  const plan = { id: "p", type: "sticky", x: -100, y: -50, z: "a0", w: 240, h: 180, text: "Plan", color: PINK, fontSize: 32 } as Item;

  beforeEach(() => {
    el.setPointerCapture = () => {};
    el.releasePointerCapture = () => {};
    el.hasPointerCapture = () => false;
    el.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: VP.w, bottom: VP.h, width: VP.w, height: VP.h }) as DOMRect;
    store = createStormStore({ body: { schema: 1, items: { p: plan } }, camera: { ...HOME_CAMERA } });
    detach = attachInput(el, store, () => VP);
  });

  /** A copy or paste event as the browser fires it at the focused element. */
  const clip = (type: "copy" | "paste", data: Record<string, string> = {}, target: EventTarget = el) => {
    const dt = new DataTransfer();
    for (const [k, v] of Object.entries(data)) dt.setData(k, v);
    const e = new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true });
    target.dispatchEvent(e);
    return { e, dt };
  };
  const added = () => Object.values(store.getSnapshot().items).filter((i) => i.id !== "p");
  const copyPlan = () => {
    store.select("p");
    return clip("copy").dt;
  };

  it("copy writes the text and the custom type for the selected sticky", () => {
    store.select("p");
    const { e, dt } = clip("copy");
    expect(e.defaultPrevented).toBe(true);
    expect(dt.getData("text/plain")).toBe("Plan");
    expect(JSON.parse(dt.getData(TYPE))).toEqual({
      v: 1,
      sticky: { text: "Plan", color: PINK, fontSize: 32, w: 240, h: 180 },
    });
  });

  it("copy with nothing selected does nothing", () => {
    const { e, dt } = clip("copy");
    expect(e.defaultPrevented).toBe(false);
    expect(dt.getData(TYPE)).toBe("");
  });

  it("paste of the custom type places a copy centred on the pointer, on top and selected, one undo step", () => {
    const dt = copyPlan();
    ptr("pointermove", at(200, 100));
    const { e } = clip("paste", { [TYPE]: dt.getData(TYPE), "text/plain": "Plan" });
    expect(e.defaultPrevented).toBe(true);
    const [copy] = added();
    expect(copy).toMatchObject({ x: 80, y: 10, w: 240, h: 180, text: "Plan", color: PINK, fontSize: 32 });
    expect(copy.z > plan.z).toBe(true);
    expect(store.getSnapshot().selectedId).toBe(copy.id);
    expect(store.getHistory().undo).toHaveLength(1);
    store.undo();
    expect(added()).toHaveLength(0);
    expect(store.getSnapshot().items.p).toEqual(plan);
  });

  it("paste goes to the view centre when the pointer never entered or has left the board", () => {
    const dt = copyPlan();
    clip("paste", { [TYPE]: dt.getData(TYPE) });
    expect(added()[0]).toMatchObject({ x: -120, y: -90 });
    ptr("pointermove", at(200, 100));
    el.dispatchEvent(new PointerEvent("pointerleave", at(200, 100)));
    clip("paste", { [TYPE]: dt.getData(TYPE) });
    ptr("pointermove", at(500, 0)); // beside the board (client x 900 > 800)
    clip("paste", { [TYPE]: dt.getData(TYPE) });
    expect(added().map((i) => [i.x, i.y])).toEqual([
      [-120, -90],
      [-120, -90],
      [-120, -90],
    ]);
  });

  it("paste of plain text makes a sticky in the creation colour, cut to 500 characters", () => {
    store.setCreationColor(PINK);
    ptr("pointermove", at(0, 0));
    const { e } = clip("paste", { "text/plain": "Call Anna" });
    expect(e.defaultPrevented).toBe(true);
    expect(added()[0]).toMatchObject({ x: -100, y: -100, w: 200, h: 200, text: "Call Anna", color: PINK });
    clip("paste", { "text/plain": "z".repeat(700) });
    expect(added().find((i) => i.text.startsWith("z"))?.text).toHaveLength(500);
  });

  it("a custom type that does not parse falls back to the plain text", () => {
    clip("paste", { [TYPE]: '{"v":2,"sticky":{}}', "text/plain": "Fallback" });
    const [s] = added();
    expect(s.text).toBe("Fallback");
    expect("color" in s).toBe(false);
  });

  it("an empty paste does nothing and keeps the default", () => {
    const { e } = clip("paste", { "text/plain": "" });
    expect(e.defaultPrevented).toBe(false);
    expect(added()).toHaveLength(0);
  });

  it("while editing, copy and paste pass through untouched", () => {
    store.startEdit("p");
    const copy = clip("copy");
    expect(copy.e.defaultPrevented).toBe(false);
    expect(copy.dt.getData(TYPE)).toBe("");
    const paste = clip("paste", { "text/plain": "word" });
    expect(paste.e.defaultPrevented).toBe(false);
    expect(added()).toHaveLength(0);
  });

  it("without board focus, copy and paste are not intercepted", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    store.select("p");
    expect(clip("copy", {}, input).e.defaultPrevented).toBe(false);
    expect(clip("paste", { "text/plain": "x" }, input).e.defaultPrevented).toBe(false);
    expect(added()).toHaveLength(0);
    input.remove();
  });

  it("detach removes the copy and paste listeners", () => {
    detach();
    store.select("p");
    expect(clip("copy").e.defaultPrevented).toBe(false);
    expect(clip("paste", { "text/plain": "x" }).e.defaultPrevented).toBe(false);
    expect(added()).toHaveLength(0);
  });
});
