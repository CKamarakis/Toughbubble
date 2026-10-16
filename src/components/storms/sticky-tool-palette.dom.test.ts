// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HOME_CAMERA } from "@/lib/storms/camera";
import type { Sticky } from "@/lib/storms/model";
import { attachInput } from "./engine/input";
import { createStormStore, type StormStore } from "./engine/store";
import { StormToolbar } from "./storm-toolbar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const VP = { w: 800, h: 600 };
const LIGHT_GREEN = "#D4F3C4";
const a: Sticky = { id: "a", type: "sticky", x: -500, y: -500, z: "a0", w: 200, h: 200, text: "" };

let surface: HTMLDivElement;
let board: HTMLDivElement;
let host: HTMLDivElement;
let root: Root;
let store: StormStore;
let detach: () => void;

beforeEach(() => {
  store = createStormStore({ body: { schema: 1, items: { a } }, camera: { ...HOME_CAMERA } });
  surface = document.createElement("div");
  surface.className = "light";
  board = document.createElement("div");
  board.tabIndex = 0;
  board.setPointerCapture = () => {};
  board.releasePointerCapture = () => {};
  board.hasPointerCapture = () => false;
  board.getBoundingClientRect = () => ({ left: 0, top: 0, width: VP.w, height: VP.h }) as DOMRect;
  host = document.createElement("div");
  surface.append(board, host);
  document.body.append(surface);
  detach = attachInput(board, store, () => VP, surface);
  root = createRoot(host);
  act(() => root.render(createElement(StormToolbar, { store, focusBoard: () => board.focus() })));
  board.focus();
});
afterEach(() => {
  act(() => root.unmount());
  detach();
  surface.remove();
});

const stickyButton = () => host.querySelector<HTMLButtonElement>('[aria-label="Sticky note (N)"]')!;
const palette = () => host.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Colour for new stickies"]');
const swatch = (name: string) => palette()!.querySelector<HTMLButtonElement>(`[role="radio"][aria-label="${name}"]`)!;
const checked = () =>
  [...palette()!.querySelectorAll('[role="radio"][aria-checked="true"]')].map((r) => r.getAttribute("aria-label"));
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
/** A left click on the board at screen (x, y). */
function clickBoard(x: number, y: number) {
  act(() => {
    board.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y, pointerId: 1 }),
    );
    board.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y, pointerId: 1 }),
    );
  });
}
const newStickies = () => Object.values(store.getSnapshot().items).filter((i) => i.id !== "a");

describe("Sticky tool palette", () => {
  it("is closed until the Sticky tool turns on; a click on Sticky opens it with Yellow marked, 2 per row", () => {
    expect(palette()).toBeNull();
    mouseClick(stickyButton());
    expect(store.getSnapshot().tool).toBe("sticky");
    expect(palette()).not.toBeNull();
    expect(checked()).toEqual(["Yellow"]);
    expect(palette()!.className).toContain("grid-cols-2");
    expect(palette()!.querySelectorAll('[role="radio"]')).toHaveLength(13);
    // Not part of the toolbar's buttons.
    expect(palette()!.closest('[role="toolbar"]')).toBeNull();
    // A mouse open leaves focus on the board, so the next click places.
    expect(document.activeElement).toBe(board);
  });

  it("pick Light green, click the board: a light green sticky there, palette closed", () => {
    mouseClick(stickyButton());
    mouseClick(swatch("Light green"));
    expect(store.getSnapshot().tool).toBe("sticky");
    expect(store.getSnapshot().creationColor).toBe(LIGHT_GREEN);
    expect(checked()).toEqual(["Light green"]);
    expect(document.activeElement).toBe(board);
    // Picking changes no board item and adds no undo step.
    expect(newStickies()).toHaveLength(0);
    expect(store.getHistory().undo).toHaveLength(0);

    clickBoard(400, 300);
    const placed = newStickies();
    expect(placed).toHaveLength(1);
    expect(placed[0].color).toBe(LIGHT_GREEN);
    expect(placed[0]).toMatchObject({ x: -100, y: -100 });
    expect(palette()).toBeNull();
    expect(store.getSnapshot().tool).toBe("select");
  });

  it("marks the current creation colour", () => {
    act(() => store.setCreationColor("#D3A1FF"));
    mouseClick(stickyButton());
    expect(checked()).toEqual(["Purple"]);
  });

  it("N opens it; Esc on the board closes it and turns the tool off", () => {
    keydown(board, "n");
    expect(palette()).not.toBeNull();
    keydown(board, "Escape");
    expect(palette()).toBeNull();
    expect(store.getSnapshot().tool).toBe("select");
  });

  it("closes when the tool is turned off with the Sticky button", () => {
    mouseClick(stickyButton());
    mouseClick(stickyButton());
    expect(store.getSnapshot().tool).toBe("select");
    expect(palette()).toBeNull();
  });

  it("keyboard: Enter on Sticky, arrows, Enter picks and keeps the tool on; Esc closes and turns it off", () => {
    act(() => stickyButton().focus());
    // Enter on a native button activates it with a click of detail 0.
    act(() => {
      stickyButton().dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 }));
    });
    expect(store.getSnapshot().tool).toBe("sticky");
    expect(document.activeElement).toBe(swatch("Yellow"));
    // 2 per row: Down moves by two.
    keydown(document.activeElement!, "ArrowDown");
    expect(document.activeElement).toBe(swatch("Pink"));
    keydown(document.activeElement!, "ArrowRight");
    expect(document.activeElement).toBe(swatch("Magenta"));
    keydown(document.activeElement!, "End");
    expect(document.activeElement).toBe(swatch("White"));
    keydown(document.activeElement!, "Home");
    keydown(document.activeElement!, "ArrowLeft");
    expect(document.activeElement).toBe(swatch("White"));
    keydown(document.activeElement!, "ArrowUp");
    expect(document.activeElement).toBe(swatch("Dark green"));
    keydown(document.activeElement!, "Enter");
    expect(store.getSnapshot().creationColor).toBe("#008135");
    expect(store.getSnapshot().tool).toBe("sticky");
    expect(document.activeElement).toBe(board);
    expect(palette()).not.toBeNull();

    // Back in with an arrow from the board (the tool's arrows do nothing on the board).
    keydown(board, "ArrowRight");
    expect(document.activeElement).toBe(swatch("Black"));
    keydown(document.activeElement!, "Escape");
    expect(palette()).toBeNull();
    expect(store.getSnapshot().tool).toBe("select");
    expect(document.activeElement).toBe(board);
    expect(store.getSnapshot().creationColor).toBe("#008135");
  });

  it("every swatch has its colour's name; roving focus keeps one in the Tab order", () => {
    mouseClick(stickyButton());
    const radios = [...palette()!.querySelectorAll<HTMLElement>('[role="radio"]')];
    expect(radios.map((r) => r.getAttribute("aria-label"))).toEqual([
      "Yellow", "Light yellow", "Pink", "Magenta", "Lavender", "Purple", "Sky blue",
      "Light blue", "Dark blue", "Light green", "Dark green", "Black", "White",
    ]);
    expect(radios.filter((r) => r.tabIndex === 0)).toEqual([swatch("Yellow")]);
  });

  it("Space on the board still pans while the palette is open (not taken by it)", () => {
    mouseClick(stickyButton());
    const e = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    act(() => {
      board.dispatchEvent(e);
    });
    expect(document.activeElement).toBe(board);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
    });
  });

  it("a press on the palette does not reach the board (no sticky placed)", () => {
    mouseClick(stickyButton());
    mouseClick(swatch("Pink"));
    expect(newStickies()).toHaveLength(0);
    expect(palette()).not.toBeNull();
  });

  it("sits in the board's light scope (stays light in the dark app theme)", () => {
    mouseClick(stickyButton());
    expect(palette()!.closest(".light")).toBe(surface);
  });
});
