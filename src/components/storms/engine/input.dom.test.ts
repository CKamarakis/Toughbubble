// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

  it("N picks the sticky tool and V the select tool", () => {
    setup();
    expect(key(el, { key: "n", code: "KeyN" }).defaultPrevented).toBe(true);
    expect(store.getSnapshot().tool).toBe("sticky");
    key(el, { key: "V", code: "KeyV" });
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
