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
