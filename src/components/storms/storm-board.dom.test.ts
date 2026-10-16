// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  loadView: vi.fn(() => null),
  saveView: vi.fn(),
  loadUndo: vi.fn(async () => null),
  saveUndo: vi.fn(async () => {}),
  autosave: vi.fn(),
  /** What the mocked `useStormAutosave` returns. */
  result: { state: { phase: "idle" }, status: "", resolving: false } as Record<string, unknown>,
}));

vi.mock("./view-store", () => ({ loadView: calls.loadView, saveView: calls.saveView }));
vi.mock("./undo-store", () => ({
  loadUndo: calls.loadUndo,
  saveUndo: calls.saveUndo,
  withTimeout: <T,>(p: Promise<T>) => p,
}));
vi.mock("./use-storm-autosave", () => ({
  useStormAutosave: (...args: unknown[]) => {
    calls.autosave(...args);
    return calls.result;
  },
}));

import StormBoard from "./storm-board";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  calls.result = { state: { phase: "idle" }, status: "", resolving: false };
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

async function mount(readOnly: boolean) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      createElement(StormBoard, {
        itemId: "bench",
        initial: { body: { schema: 1, items: {} }, version: 0 },
        userId: "bench",
        onStatus: () => {},
        readOnly,
      }),
    );
  });
  return root;
}

describe("StormBoard readOnly", () => {
  it("never loads or saves the board, undo history or view", async () => {
    const root = await mount(true);
    expect(window.__stormBench).toBeDefined();
    await act(async () => {
      window.__stormBench!.store.setCamera({ x: 50, y: 50, zoom: 2 });
    });
    await act(async () => root.unmount());

    expect(calls.loadView).not.toHaveBeenCalled();
    expect(calls.saveView).not.toHaveBeenCalled();
    expect(calls.loadUndo).not.toHaveBeenCalled();
    expect(calls.saveUndo).not.toHaveBeenCalled();
    expect(calls.autosave).not.toHaveBeenCalled();
  });
});

describe("StormBoard conflict bar", () => {
  const buttons = () =>
    ["Load latest", "Keep mine"].map(
      (name) => [...document.querySelectorAll("button")].find((b) => b.textContent === name)!,
    );

  it("offers both choices, and disables both while one is being handled", async () => {
    calls.result = { state: { phase: "conflict" }, status: "Changed elsewhere", resolving: false };
    const root = await mount(false);
    expect(buttons().map((b) => b.disabled)).toEqual([false, false]);
    await act(async () => root.unmount());

    calls.result = { state: { phase: "conflict" }, status: "Changed elsewhere", resolving: true };
    const again = await mount(false);
    expect(buttons().map((b) => b.disabled)).toEqual([true, true]);
    await act(async () => again.unmount());
  });
});

describe("StormBoard sticky toolbar", () => {
  it("shows the sticky toolbar for a selected sticky, inside the board's light scope", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        createElement(StormBoard, {
          itemId: "bench",
          initial: {
            body: { schema: 1, items: { a: { id: "a", type: "sticky", x: 0, y: 0, z: "a0", w: 200, h: 200, text: "" } } },
            version: 0,
          },
          userId: "bench",
          onStatus: () => {},
          readOnly: true,
        }),
      );
    });
    const find = () => host.querySelector('[role="toolbar"][aria-label="Sticky tools"]');
    expect(find()).toBeNull();
    await act(async () => window.__stormBench!.store.select("a"));
    expect(find()?.closest(".light")).not.toBeNull();
    await act(async () => root.unmount());
  });
});

describe("StormBoard creation colour", () => {
  afterEach(() => localStorage.clear());

  it("starts from this user's remembered colour and remembers a new pick", async () => {
    localStorage.setItem("storm-sticky-color:bench", "#D3A1FF");
    const root = await mount(false);
    const store = window.__stormStore!;
    expect(store.getSnapshot().creationColor).toBe("#D3A1FF");
    await act(async () => store.setCreationColor("#D4F3C4"));
    expect(localStorage.getItem("storm-sticky-color:bench")).toBe("#D4F3C4");
    await act(async () => root.unmount());
    // Unmounted: no more writes.
    store.setCreationColor("#141310");
    expect(localStorage.getItem("storm-sticky-color:bench")).toBe("#D4F3C4");
  });

  it("a read-only board neither reads nor writes it", async () => {
    localStorage.setItem("storm-sticky-color:bench", "#D3A1FF");
    const root = await mount(true);
    const store = window.__stormBench!.store;
    expect(store.getSnapshot().creationColor).toBe("#F7D000");
    await act(async () => store.setCreationColor("#D4F3C4"));
    expect(localStorage.getItem("storm-sticky-color:bench")).toBe("#D3A1FF");
    await act(async () => root.unmount());
  });
});
