import { describe, expect, it } from "vitest";
import {
  autosaveReducer as reduce,
  canStartSave,
  hasUnsavedChanges,
  initialAutosave,
  retryDelay,
  statusLabel,
  type AutosaveEvent,
  type AutosaveState,
} from "./autosave";

const run = (start: AutosaveState, ...events: AutosaveEvent[]) => events.reduce(reduce, start);

describe("autosave", () => {
  it("starts clean and becomes dirty on edit (the hook then waits for a pause)", () => {
    const s = run(initialAutosave(3), { type: "edit" });
    expect(s).toMatchObject({ phase: "dirty", dirty: true, version: 3 });
    expect(canStartSave(initialAutosave(3))).toBe(false);
    expect(canStartSave(s)).toBe(true);
    expect(hasUnsavedChanges(s)).toBe(true);
  });

  it("saves and returns to idle on the new version", () => {
    const s = run(initialAutosave(0), { type: "edit" }, { type: "save-start" }, { type: "save-ok", version: 1 });
    expect(s).toMatchObject({ phase: "idle", dirty: false, version: 1 });
    expect(hasUnsavedChanges(s)).toBe(false);
    expect(statusLabel(s, true)).toBe("Saved");
  });

  it("allows only one save in flight and queues a follow-up for edits made meanwhile", () => {
    let s = run(initialAutosave(1), { type: "edit" }, { type: "save-start" });
    expect(s.phase).toBe("saving");
    s = reduce(s, { type: "edit" });
    expect(canStartSave(s)).toBe(false); // still saving
    expect(reduce(s, { type: "save-start" })).toBe(s);
    s = reduce(s, { type: "save-ok", version: 2 });
    expect(s).toMatchObject({ phase: "dirty", dirty: true, version: 2 });
    expect(canStartSave(s)).toBe(true);
  });

  it("keeps the changes and retries with growing delays after errors", () => {
    let s = run(initialAutosave(1), { type: "edit" }, { type: "save-start" }, { type: "save-error", error: "offline" });
    expect(s).toMatchObject({ phase: "error", dirty: true, retries: 1 });
    expect(canStartSave(s)).toBe(true);
    expect(statusLabel(s, true)).toBe("Couldn't save — retrying");
    s = run(s, { type: "save-start" }, { type: "save-error", error: "offline" });
    expect(s.retries).toBe(2);
    expect([1, 2, 3, 4, 5, 6, 10].map(retryDelay)).toEqual([2000, 4000, 8000, 16000, 30000, 30000, 30000]);
    s = run(s, { type: "save-start" }, { type: "save-ok", version: 2 });
    expect(s).toMatchObject({ phase: "idle", retries: 0, error: null });
  });

  it("stops saving on a conflict until the user chooses", () => {
    let s = run(initialAutosave(1), { type: "edit" }, { type: "save-start" }, { type: "save-conflict", storedVersion: 4 });
    expect(s).toMatchObject({ phase: "conflict", dirty: true, storedVersion: 4 });
    expect(canStartSave(s)).toBe(false);
    s = reduce(s, { type: "edit" });
    expect(s.phase).toBe("conflict");
    expect(statusLabel(s, true)).toBe("Changed elsewhere");
    expect(hasUnsavedChanges(s)).toBe(true);
  });

  it("Keep mine saves on top of the stored version", () => {
    const s = run(
      initialAutosave(1),
      { type: "edit" },
      { type: "save-start" },
      { type: "save-conflict", storedVersion: 4 },
      { type: "keep-mine" },
    );
    expect(s).toMatchObject({ phase: "dirty", version: 4, storedVersion: null });
    expect(canStartSave(s)).toBe(true);
  });

  it("Load latest discards local changes", () => {
    const s = run(
      initialAutosave(1),
      { type: "edit" },
      { type: "save-start" },
      { type: "save-conflict", storedVersion: 4 },
      { type: "load-latest", version: 4 },
    );
    expect(s).toEqual(initialAutosave(4));
  });

  it("takes a newer version quietly only when nothing is unsaved", () => {
    expect(reduce(initialAutosave(2), { type: "refreshed", version: 5 }).version).toBe(5);
    const dirty = reduce(initialAutosave(2), { type: "edit" });
    expect(reduce(dirty, { type: "refreshed", version: 5 })).toBe(dirty);
    expect(reduce(initialAutosave(5), { type: "refreshed", version: 3 }).version).toBe(5);
  });

  it("shows no status for a note never saved", () => {
    expect(statusLabel(initialAutosave(0), false)).toBe("");
  });
});
