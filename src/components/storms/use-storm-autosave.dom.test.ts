// @vitest-environment happy-dom
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOME_CAMERA } from "@/lib/storms/camera";
import type { SaveStormActionResult } from "@/lib/storms/actions";
import type { Sticky, StormBody } from "@/lib/storms/model";
import { createStormStore, type StormStore } from "./engine/store";
import { useStormAutosave } from "./use-storm-autosave";

const mocks = vi.hoisted(() => ({
  saveStorm: vi.fn(),
  loadStorm: vi.fn(),
  stormVersion: vi.fn(),
  touch: vi.fn(),
  toastError: vi.fn(),
  quietSave: vi.fn(),
}));
vi.mock("@/lib/storms/actions", () => ({
  saveStorm: mocks.saveStorm,
  loadStorm: mocks.loadStorm,
  stormVersion: mocks.stormVersion,
}));
vi.mock("@/components/workspace/workspace-context", () => ({ useWorkspace: () => ({ touch: mocks.touch }) }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ID = "11111111-1111-4111-8111-111111111111";
const sticky = (id: string, x = 0): Sticky => ({ id, type: "sticky", x, y: 0, z: "a0", w: 200, h: 200, text: "" });
const board = (...items: Sticky[]): StormBody => ({ schema: 1, items: Object.fromEntries(items.map((i) => [i.id, i])) });
const add = (s: Sticky) => ({ upsert: [s], delete: [] });
const saved = (version: number): SaveStormActionResult => ({ status: "saved", version, editedAt: "2026-10-11T00:00:00Z" });

/** A promise resolved from the test. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

let host: HTMLDivElement;
let root: Root;
let store: StormStore;
let autosave: ReturnType<typeof useStormAutosave>;

function Harness({ s }: { s: StormStore }) {
  // Records the history the board would persist at that moment (storm-board persists the store's).
  const a = useStormAutosave(s, ID, 1, { onQuietSave: (v) => mocks.quietSave(v, s.getHistoryForPersist()) });
  useEffect(() => {
    autosave = a;
  });
  return null;
}

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(async () => {
  vi.useFakeTimers();
  for (const m of Object.values(mocks)) m.mockReset();
  host = document.createElement("div");
  document.body.appendChild(host);
  store = createStormStore({ body: board(), camera: { ...HOME_CAMERA } });
  root = createRoot(host);
  await act(async () => root.render(createElement(Harness, { s: store })));
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("useStormAutosave", () => {
  it("saves after a pause and sends edits made during a save next", async () => {
    const first = deferred<SaveStormActionResult>();
    mocks.saveStorm.mockReturnValueOnce(first.promise).mockResolvedValueOnce(saved(3));
    act(() => store.commit(add(sticky("a"))));
    expect(autosave.status).toBe("Saving…");
    await advance(999);
    expect(mocks.saveStorm).not.toHaveBeenCalled();
    await advance(1);
    expect(mocks.saveStorm).toHaveBeenCalledWith(ID, add(sticky("a")), 1);

    act(() => store.commit(add(sticky("b"))));
    await act(async () => first.resolve(saved(2)));
    expect(mocks.touch).toHaveBeenCalledWith(ID, "2026-10-11T00:00:00Z");
    await advance(1000);
    expect(mocks.saveStorm).toHaveBeenCalledTimes(2);
    expect(mocks.saveStorm).toHaveBeenLastCalledWith(ID, add(sticky("b")), 2);
    expect(autosave.status).toBe("Saved");
    expect(autosave.isQuiet()).toBe(true);
  });

  it("retries a failed save and keeps the changes", async () => {
    mocks.saveStorm.mockResolvedValueOnce({ status: "error", error: "Couldn't save. Retrying…" });
    mocks.saveStorm.mockResolvedValueOnce(saved(2));
    act(() => store.commit(add(sticky("a"))));
    await advance(1000);
    expect(autosave.status).toBe("Couldn't save — retrying");
    expect(autosave.isQuiet()).toBe(false);
    await advance(2000);
    expect(mocks.saveStorm).toHaveBeenCalledTimes(2);
    expect(mocks.saveStorm).toHaveBeenLastCalledWith(ID, add(sticky("a")), 1);
    expect(autosave.status).toBe("Saved");
  });

  it("a conflict shows Changed elsewhere; Load latest replaces the board", async () => {
    mocks.saveStorm.mockResolvedValueOnce({ status: "conflict", storedVersion: 4 });
    act(() => store.commit(add(sticky("a"))));
    await advance(1000);
    expect(autosave.state.phase).toBe("conflict");
    expect(autosave.status).toBe("Changed elsewhere");

    mocks.loadStorm.mockResolvedValueOnce({ body: board(sticky("other")), version: 4 });
    await act(() => autosave.loadLatest());
    expect(Object.keys(store.getSnapshot().items)).toEqual(["other"]);
    expect(autosave.status).toBe("Saved");
    expect(autosave.isQuiet()).toBe(true);
    await advance(5000);
    expect(mocks.saveStorm).toHaveBeenCalledTimes(1);
  });

  it("Keep mine saves on the stored version, then shows the combined board", async () => {
    mocks.saveStorm.mockResolvedValueOnce({ status: "conflict", storedVersion: 4 });
    act(() => store.commit(add(sticky("a"))));
    await advance(1000);

    mocks.saveStorm.mockResolvedValueOnce(saved(5));
    mocks.loadStorm.mockResolvedValueOnce({ body: board(sticky("a"), sticky("other")), version: 5 });
    act(() => autosave.keepMine());
    await advance(0);
    expect(mocks.saveStorm).toHaveBeenLastCalledWith(ID, add(sticky("a")), 4);
    await advance(0);
    expect(Object.keys(store.getSnapshot().items).sort()).toEqual(["a", "other"]);
    expect(store.getSnapshot().canUndo).toBe(false);
    expect(autosave.status).toBe("Saved");
    // The history persisted at version 5 is the cleared one, never the pre-merge one.
    expect(mocks.quietSave).toHaveBeenCalledExactlyOnceWith(5, { undo: [], redo: [] });
  });

  it("Load latest that fails keeps the conflict bar and says so", async () => {
    mocks.saveStorm.mockResolvedValueOnce({ status: "conflict", storedVersion: 4 });
    act(() => store.commit(add(sticky("a"))));
    await advance(1000);

    mocks.loadStorm.mockRejectedValueOnce(new Error("offline"));
    await act(() => autosave.loadLatest());
    expect(mocks.toastError).toHaveBeenLastCalledWith("Couldn't load the latest version. Try again.");
    expect(autosave.state.phase).toBe("conflict");
    expect(autosave.resolving).toBe(false);
    expect(Object.keys(store.getSnapshot().items)).toEqual(["a"]);

    mocks.loadStorm.mockResolvedValueOnce(null);
    await act(() => autosave.loadLatest());
    expect(mocks.toastError).toHaveBeenLastCalledWith("This storm is no longer available.");
    expect(autosave.state.phase).toBe("conflict");
  });

  it("while Load latest is pending, both choices are blocked", async () => {
    mocks.saveStorm.mockResolvedValueOnce({ status: "conflict", storedVersion: 4 });
    act(() => store.commit(add(sticky("a"))));
    await advance(1000);

    const latest = deferred<{ body: StormBody; version: number }>();
    mocks.loadStorm.mockReturnValueOnce(latest.promise);
    let pending!: Promise<void>;
    act(() => {
      pending = autosave.loadLatest();
    });
    expect(autosave.resolving).toBe(true);
    act(() => autosave.keepMine());
    await act(() => autosave.loadLatest());
    expect(autosave.state.phase).toBe("conflict");
    expect(mocks.loadStorm).toHaveBeenCalledTimes(1);

    await act(async () => {
      latest.resolve({ body: board(sticky("other")), version: 4 });
      await pending;
    });
    expect(autosave.resolving).toBe(false);
    expect(Object.keys(store.getSnapshot().items)).toEqual(["other"]);
    await advance(5000);
    expect(mocks.saveStorm).toHaveBeenCalledTimes(1);
  });

  it("after Keep mine, Load latest is blocked until the save is back", async () => {
    mocks.saveStorm.mockResolvedValueOnce({ status: "conflict", storedVersion: 4 });
    act(() => store.commit(add(sticky("a"))));
    await advance(1000);

    const second = deferred<SaveStormActionResult>();
    mocks.saveStorm.mockReturnValueOnce(second.promise);
    act(() => autosave.keepMine());
    expect(autosave.resolving).toBe(true);
    await advance(0);
    await act(() => autosave.loadLatest());
    expect(mocks.loadStorm).not.toHaveBeenCalled();

    // The Keep mine save conflicts again: the choice is offered again.
    await act(async () => second.resolve({ status: "conflict", storedVersion: 6 }));
    expect(autosave.state.phase).toBe("conflict");
    expect(autosave.resolving).toBe(false);
  });

  it("a board too big to save shows the message once and waits for the next change", async () => {
    mocks.saveStorm.mockResolvedValueOnce({ status: "too-large" });
    act(() => store.commit(add(sticky("a"))));
    await advance(1000);
    expect(autosave.status).toBe("Too big to save");
    expect(mocks.toastError).toHaveBeenCalledExactlyOnceWith("This storm is too big to save. Remove some items.");
    await advance(60_000);
    expect(mocks.saveStorm).toHaveBeenCalledTimes(1);

    mocks.saveStorm.mockResolvedValueOnce(saved(2));
    act(() => store.commit(add(sticky("b"))));
    await advance(1000);
    expect(mocks.saveStorm).toHaveBeenLastCalledWith(
      ID,
      { upsert: [sticky("a"), sticky("b")], delete: [] },
      1,
    );
  });

  it("returning to the tab with nothing unsaved shows a newer stored board", async () => {
    mocks.stormVersion.mockResolvedValueOnce(3);
    mocks.loadStorm.mockResolvedValueOnce({ body: board(sticky("other")), version: 3 });
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    await advance(0);
    expect(Object.keys(store.getSnapshot().items)).toEqual(["other"]);
    expect(autosave.savedVersion()).toBe(3);
  });

  it("leaving sends pending changes right away", async () => {
    mocks.saveStorm.mockResolvedValue(saved(2));
    act(() => store.commit(add(sticky("a"))));
    await act(async () => root.unmount());
    expect(mocks.saveStorm).toHaveBeenCalledWith(ID, add(sticky("a")), 1);
    root = createRoot(host);
  });
});

describe("useStormAutosave undo persistence hook", () => {
  it("reports a quiet save only when nothing is pending", async () => {
    const first = deferred<SaveStormActionResult>();
    mocks.saveStorm.mockReturnValueOnce(first.promise).mockResolvedValueOnce(saved(3));
    act(() => store.commit(add(sticky("a"))));
    await advance(1000);
    act(() => store.commit(add(sticky("b"))));
    await act(async () => first.resolve(saved(2)));
    expect(mocks.quietSave).not.toHaveBeenCalled();
    await advance(1000);
    expect(mocks.quietSave).toHaveBeenCalledTimes(1);
    expect(mocks.quietSave).toHaveBeenCalledWith(3, expect.anything());
  });

  it("Load latest and a focus refresh persist nothing (the old history stays at an older version)", async () => {
    mocks.saveStorm.mockResolvedValueOnce({ status: "conflict", storedVersion: 4 });
    act(() => store.commit(add(sticky("a"))));
    await advance(1000);
    mocks.loadStorm.mockResolvedValueOnce({ body: board(sticky("other")), version: 4 });
    await act(() => autosave.loadLatest());
    mocks.stormVersion.mockResolvedValueOnce(6);
    mocks.loadStorm.mockResolvedValueOnce({ body: board(sticky("newer")), version: 6 });
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    await advance(0);
    expect(Object.keys(store.getSnapshot().items)).toEqual(["newer"]);
    expect(mocks.quietSave).not.toHaveBeenCalled();
  });
});
