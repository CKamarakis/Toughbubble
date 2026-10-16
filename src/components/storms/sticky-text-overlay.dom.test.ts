// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOME_CAMERA } from "@/lib/storms/camera";
import { MAX_TEXT } from "@/lib/storms/limits";
import type { Sticky } from "@/lib/storms/model";
import { fitFontSize, layoutSticky, type SizedMeasure } from "@/lib/storms/text-layout";
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
  it("a paste of 800 characters that bypasses maxLength keeps the first 500", async () => {
    const pasted = "abcde".repeat(160);
    await act(async () => type(textarea()!, pasted));
    expect(store.getSnapshot().items.a.text).toBe(pasted.slice(0, 500));
    expect(store.getSnapshot().items.a.text).toHaveLength(MAX_TEXT);
  });
});

describe("finishing", () => {
  it("returns the editor to scrollTop 0 on Esc", async () => {
    const ta = textarea()!;
    ta.scrollTop = 40;
    await act(async () => {
      ta.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(ta.scrollTop).toBe(0);
  });
  it("returns the editor to scrollTop 0 on a press outside", async () => {
    const ta = textarea()!;
    ta.scrollTop = 40;
    await act(async () => {
      document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    expect(ta.scrollTop).toBe(0);
  });
  it("starting an edit on text that fits leaves scrollTop at 0", async () => {
    expect(textarea()!.scrollTop).toBe(0);
  });
});

describe("fitted size (no jump)", () => {
  /** Every character is half the font size wide. */
  const measure: SizedMeasure = (t, px) => t.length * px * 0.5;
  const px = (v: string) => Number.parseFloat(v);

  /** Restarts the edit with the board's measure set, as the board does once the font loads. */
  async function withMeasure(zoom = 1) {
    await act(async () => {
      store.endEdit();
      store.setMeasure(measure);
      store.setCamera({ x: 0, y: 0, zoom });
      store.startEdit("a");
    });
  }

  it("the textarea font size equals the fitted size after each keystroke, as the text shrinks", async () => {
    await withMeasure(2);
    const words = "Long text gets smaller as you keep on typing more and more words into it";
    let previous = Infinity;
    for (let n = 1; n <= words.length; n += 3) {
      const text = words.slice(0, n);
      await act(async () => type(textarea()!, text));
      const stored = store.getSnapshot().items.a.fontSize!;
      expect(stored).toBe(fitFontSize(measure, text, 200, 200));
      expect(px(textarea()!.style.fontSize)).toBe(stored * 2);
      expect(px(textarea()!.style.lineHeight)).toBeCloseTo(stored * 1.3 * 2);
      expect(stored).toBeLessThanOrEqual(previous);
      previous = stored;
    }
    expect(previous).toBeLessThan(64);
  });

  it("text that fits at 40 px shrinks to the largest size that fits once it no longer does", async () => {
    await withMeasure();
    let text = "w";
    while (fitFontSize(measure, text + " w", 200, 200) >= 40) text += " w";
    await act(async () => type(textarea()!, text));
    expect(px(textarea()!.style.fontSize)).toBeGreaterThanOrEqual(40);
    await act(async () => type(textarea()!, text + " w"));
    const size = fitFontSize(measure, text + " w", 200, 200);
    expect(size).toBeLessThan(40);
    expect(px(textarea()!.style.fontSize)).toBe(size);
  });

  it("starting an edit on an unsized sticky shows it at its fitted size, without changing it", async () => {
    const changes: unknown[] = [];
    store.onChange((cs) => changes.push(cs));
    await withMeasure();
    const s = store.getSnapshot().items.a;
    expect(s.fontSize).toBeUndefined();
    const layout = layoutSticky(measure, s);
    expect(px(textarea()!.style.fontSize)).toBe(layout.fontSize);
    expect(px(textarea()!.style.paddingTop)).toBeCloseTo(layout.top);
    expect(changes).toEqual([]);
  });

  it("an edit opened before the font loaded lays out again when the measure arrives", async () => {
    const text = "Talk to users first, then cut scope and keep the core";
    await act(async () => store.commit({ upsert: [{ ...a, text }], delete: [] }, "none"));
    const fitted = fitFontSize(measure, text, 200, 200);
    expect(px(textarea()!.style.fontSize)).not.toBe(fitted);
    await act(async () => store.setMeasure(measure));
    expect(px(textarea()!.style.fontSize)).toBe(fitted);
  });

  it("starting an edit on a sized sticky uses its stored size", async () => {
    await act(async () => {
      store.endEdit();
      store.commit({ upsert: [{ ...a, text: "hi", fontSize: 30 }], delete: [] }, "none");
    });
    await withMeasure();
    expect(px(textarea()!.style.fontSize)).toBe(30);
  });

  it("finishing keeps the size the editor showed, so the canvas draws the same lines", async () => {
    await withMeasure();
    const text = "Talk to users first, then cut scope and keep the core";
    await act(async () => type(textarea()!, text));
    const shown = px(textarea()!.style.fontSize);
    const top = px(textarea()!.style.paddingTop);
    await act(async () => {
      textarea()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    const s = store.getSnapshot().items.a;
    expect(s.fontSize).toBe(shown);
    // The canvas lays out the finished sticky with the same measure and size.
    const layout = layoutSticky(measure, s);
    expect(layout.fontSize).toBe(shown);
    expect(layout.top).toBeCloseTo(top);
    await act(async () => store.startEdit("a"));
    expect(px(textarea()!.style.fontSize)).toBe(shown);
    expect(px(textarea()!.style.paddingTop)).toBeCloseTo(top);
  });
});
