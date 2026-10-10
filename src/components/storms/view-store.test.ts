import { afterEach, describe, expect, it, vi } from "vitest";
import { loadView, saveView } from "./view-store";

function stubStorage(data: Record<string, string> = {}) {
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  });
  return data;
}

afterEach(() => vi.unstubAllGlobals());

describe("view-store", () => {
  it("round-trips a camera", () => {
    const data = stubStorage();
    saveView("s1", { x: 12.5, y: -40, zoom: 1.5 });
    expect(data["storm-view:s1"]).toBeDefined();
    expect(loadView("s1")).toEqual({ x: 12.5, y: -40, zoom: 1.5 });
  });

  it("returns null when nothing is saved", () => {
    stubStorage();
    expect(loadView("none")).toBeNull();
  });

  it("returns null on bad JSON", () => {
    stubStorage({ "storm-view:s1": "{nope" });
    expect(loadView("s1")).toBeNull();
  });

  it("returns null for non-finite or out-of-range values", () => {
    stubStorage({
      "storm-view:a": JSON.stringify({ x: "1", y: 0, zoom: 1 }),
      "storm-view:b": JSON.stringify({ x: 0, y: 0, zoom: 9 }),
      "storm-view:c": JSON.stringify({ x: 0, y: 0, zoom: 0.01 }),
      "storm-view:d": JSON.stringify({ x: null, y: 0, zoom: 1 }),
      "storm-view:e": "null",
    });
    for (const id of ["a", "b", "c", "d", "e"]) expect(loadView(id)).toBeNull();
  });

  it("returns null when storage throws, and save does not throw", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("full");
      },
    });
    expect(loadView("s1")).toBeNull();
    expect(() => saveView("s1", { x: 0, y: 0, zoom: 1 })).not.toThrow();
  });
});
