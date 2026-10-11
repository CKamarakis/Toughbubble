import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { History } from "@/lib/storms/history";
import { undoKey, shouldPersist, versionMatches } from "./undo-store";

describe("shouldPersist", () => {
  it("writes history after a saved result when quiet", () => {
    expect(shouldPersist(true, { status: "saved", version: 2, editedAt: "x" })).toBe(true);
  });
  it("does not write history while changes are pending", () => {
    expect(shouldPersist(false, { status: "saved", version: 2, editedAt: "x" })).toBe(false);
  });
  it("does not write history for results that are not saved", () => {
    expect(shouldPersist(true, { status: "conflict", storedVersion: 3 })).toBe(false);
    expect(shouldPersist(true, { status: "too-large" })).toBe(false);
    expect(shouldPersist(true, { status: "not-found" })).toBe(false);
    expect(shouldPersist(true, { status: "error", error: "x" })).toBe(false);
  });
});

describe("undo entries", () => {
  it("keys by user and storm", () => {
    expect(undoKey("u1", "s1")).toBe("u1:s1");
  });
  it("is used only when the stored version equals the server version", () => {
    expect(versionMatches({ version: 4 }, 4)).toBe(true);
    expect(versionMatches({ version: 4 }, 5)).toBe(false);
    expect(versionMatches(undefined, 4)).toBe(false);
    expect(versionMatches({ version: "4" }, 4)).toBe(false);
  });
});

describe("undo history in IndexedDB", () => {
  const history: History = {
    undo: [{ do: { upsert: [], delete: ["a"] }, undo: { upsert: [], delete: [] } }],
    redo: [],
  };
  /** A fresh module (the sign-out flag is module state) over a fresh database. */
  let undo: typeof import("./undo-store");

  beforeEach(async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    vi.resetModules();
    undo = await import("./undo-store");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the saved history for the same version", async () => {
    await undo.saveUndo("u1", "s1", 3, history);
    expect(await undo.loadUndo("u1", "s1", 3)).toEqual(history);
  });

  it("returns null for another version and deletes the entry", async () => {
    await undo.saveUndo("u1", "s1", 3, history);
    expect(await undo.loadUndo("u1", "s1", 4)).toBeNull();
    expect(await undo.loadUndo("u1", "s1", 3)).toBeNull();
  });

  it("clearUndo removes every entry", async () => {
    await undo.saveUndo("u1", "s1", 3, history);
    await undo.saveUndo("u1", "s2", 1, history);
    await undo.clearUndo();
    expect(await undo.loadUndo("u1", "s1", 3)).toBeNull();
    expect(await undo.loadUndo("u1", "s2", 1)).toBeNull();
  });

  it("after beginSignOut, a late saveUndo writes nothing", async () => {
    await undo.saveUndo("u1", "s1", 3, history);
    await undo.beginSignOut();
    expect(await undo.loadUndo("u1", "s1", 3)).toBeNull();
    await undo.saveUndo("u1", "s1", 4, history);
    expect(await undo.loadUndo("u1", "s1", 4)).toBeNull();
  });

  it("a save already started when sign-out begins writes nothing", async () => {
    const late = undo.saveUndo("u1", "s1", 5, history);
    await undo.beginSignOut();
    await late;
    expect(await undo.loadUndo("u1", "s1", 5)).toBeNull();
  });
});
