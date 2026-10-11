import { describe, expect, it } from "vitest";
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
