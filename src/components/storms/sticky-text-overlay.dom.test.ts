// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOME_CAMERA } from "@/lib/storms/camera";
import { MAX_TEXT } from "@/lib/storms/limits";
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

  it("starts at the top, and keeps a scroll the caret caused so the rest of the text is reachable", async () => {
    const ta = textarea()!;
    expect(ta.scrollTop).toBe(0);
    // The browser scrolls the editor to follow the caret through text longer than the sticky.
    ta.scrollTop = 40;
    await act(async () => ta.dispatchEvent(new Event("scroll")));
    expect(ta.scrollTop).toBe(40);
    await act(async () => type(ta, "x ".repeat(100)));
    expect(ta.scrollTop).toBe(40);
  });

  it("long pasted text is all in the editor after finishing and editing again", async () => {
    const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    await act(async () => type(textarea()!, long));
    await act(async () => {
      textarea()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    await act(async () => store.startEdit("a"));
    expect(textarea()!.value).toBe(long);
    expect(textarea()!.scrollTop).toBe(0);
  });
});

describe("text limit", () => {
  it("the editor caps input at 500 characters, so a paste of 800 keeps the first 500", () => {
    expect(MAX_TEXT).toBe(500);
    expect(textarea()!.maxLength).toBe(500);
    // Browsers truncate a paste to maxLength; this is that rule applied to 800 characters.
    const pasted = "abcde".repeat(160);
    expect(pasted.slice(0, textarea()!.maxLength)).toBe(pasted.slice(0, 500));
    expect(pasted.slice(0, textarea()!.maxLength)).toHaveLength(500);
  });
});
