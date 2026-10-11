// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOME_CAMERA } from "@/lib/storms/camera";
import type { Sticky } from "@/lib/storms/model";
import { createStormStore, type StormStore } from "./engine/store";
import { StickyTextOverlay } from "./sticky-text-overlay";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const a: Sticky = { id: "a", type: "sticky", x: 0, y: 0, z: "a0", w: 200, h: 200, text: "hi" };

let host: HTMLDivElement;
let root: Root;
let store: StormStore;
let onExit: ReturnType<typeof vi.fn<() => void>>;

const textarea = () => host.querySelector("textarea");

/** Sets the value the way the browser does, so React's onChange fires. */
function type(ta: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  setter.call(ta, value);
  ta.dispatchEvent(new Event("input", { bubbles: true }));
}

beforeEach(async () => {
  host = document.createElement("div");
  document.body.appendChild(host);
  store = createStormStore({ body: { schema: 1, items: { a } }, camera: { ...HOME_CAMERA } });
  onExit = vi.fn<() => void>();
  root = createRoot(host);
  await act(async () => {
    root.render(
      createElement(StickyTextOverlay, {
        store,
        family: "",
        getViewport: () => ({ w: 800, h: 600 }),
        onExit,
      }),
    );
  });
  await act(async () => store.startEdit("a"));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

describe("StickyTextOverlay", () => {
  it("shows a focused textarea while editing", () => {
    const ta = textarea();
    expect(ta?.value).toBe("hi");
    expect(document.activeElement).toBe(ta);
  });

  it("typing commits the text without history", async () => {
    await act(async () => type(textarea()!, "Ideas"));
    expect(store.getSnapshot().items.a.text).toBe("Ideas");
    expect(store.getHistory().undo).toHaveLength(0);
  });

  it("Esc finishes with one undo step and refocuses the board", async () => {
    await act(async () => type(textarea()!, "Ideas"));
    await act(async () => {
      textarea()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(store.getSnapshot().editingId).toBeNull();
    expect(store.getHistory().undo).toHaveLength(1);
    expect(onExit).toHaveBeenCalledOnce();
    expect(textarea()).toBeNull();
  });

  it("Esc during IME composition does nothing", async () => {
    await act(async () => {
      textarea()!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true, isComposing: true }),
      );
    });
    expect(store.getSnapshot().editingId).toBe("a");
    expect(onExit).not.toHaveBeenCalled();
  });

  it("blur finishes the edit", async () => {
    await act(async () => textarea()!.blur());
    expect(store.getSnapshot().editingId).toBeNull();
  });

  it("a press outside finishes the edit; inside does not", async () => {
    await act(async () => {
      textarea()!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    expect(store.getSnapshot().editingId).toBe("a");
    await act(async () => {
      document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    expect(store.getSnapshot().editingId).toBeNull();
  });

  it("never scrolls, so lines stay where the canvas draws them", async () => {
    const ta = textarea()!;
    ta.scrollTop = 40;
    await act(async () => ta.dispatchEvent(new Event("scroll")));
    expect(ta.scrollTop).toBe(0);
  });
});
