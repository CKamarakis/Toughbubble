// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  loadView: vi.fn(() => null),
  saveView: vi.fn(),
  loadUndo: vi.fn(async () => null),
  saveUndo: vi.fn(async () => {}),
  autosave: vi.fn(),
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
    return { state: { phase: "idle" }, status: "" };
  },
}));

import StormBoard from "./storm-board";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("StormBoard readOnly", () => {
  it("never loads or saves the board, undo history or view", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
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
          readOnly: true,
        }),
      );
    });
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
    vi.unstubAllGlobals();
  });
});
