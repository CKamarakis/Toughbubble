// @vitest-environment happy-dom
import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HOME_CAMERA } from "@/lib/storms/camera";
import { attachInput } from "./engine/input";
import { createStormStore, type StormStore } from "./engine/store";
import { StormToolbar } from "./storm-toolbar";
import { ZoomControl } from "./zoom-control";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let board: HTMLDivElement;
let host: HTMLDivElement;
let root: Root;
let store: StormStore;
let detach: () => void;

beforeEach(() => {
  store = createStormStore({ body: { items: {} } as never, camera: { ...HOME_CAMERA } });
  board = document.createElement("div");
  board.tabIndex = 0;
  host = document.createElement("div");
  document.body.append(board, host);
  detach = attachInput(board, store, () => ({ w: 800, h: 600 }));
  root = createRoot(host);
  act(() => {
    root.render(
      createElement("div", null, [
        createElement(StormToolbar, { key: "t", store }),
        createElement(ZoomControl, { key: "z", store, getViewport: () => ({ w: 800, h: 600 }) }),
      ]),
    );
  });
  board.focus();
});
afterEach(() => {
  act(() => root.unmount());
  detach();
  board.remove();
  host.remove();
});

/** What a mouse click does: mousedown (its default may move focus), then click. */
function mouseClick(btn: HTMLElement) {
  const down = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
  btn.dispatchEvent(down);
  if (!down.defaultPrevented) btn.focus();
  act(() => btn.click());
}
const press = (k: string) =>
  board.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
const button = (label: string) => host.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;

describe("board controls keep keyboard focus on the board", () => {
  it("clicking a toolbar button leaves focus on the board and V/N still work", () => {
    mouseClick(button("Sticky note (N)"));
    expect(store.getSnapshot().tool).toBe("sticky");
    expect(document.activeElement).toBe(board);
    press("v");
    expect(store.getSnapshot().tool).toBe("select");
    press("n");
    expect(store.getSnapshot().tool).toBe("sticky");
  });

  it("clicking a zoom button leaves focus on the board and zoom keys still work", () => {
    mouseClick(button("Zoom in"));
    expect(store.getSnapshot().camera.zoom).toBe(1.5);
    expect(document.activeElement).toBe(board);
    board.dispatchEvent(new KeyboardEvent("keydown", { key: "0", ctrlKey: true, bubbles: true }));
    expect(store.getSnapshot().camera.zoom).toBe(1);
  });

  it("a button can still be focused with the keyboard and activated", () => {
    const b = button("Sticky note (N)");
    b.focus();
    expect(document.activeElement).toBe(b);
    act(() => b.click());
    expect(store.getSnapshot().tool).toBe("sticky");
  });
});
