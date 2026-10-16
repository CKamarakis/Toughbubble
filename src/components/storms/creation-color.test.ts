import { afterEach, describe, expect, it, vi } from "vitest";
import type { StormBody } from "@/lib/storms/model";
import { placeSticky } from "./engine/actions";
import { createStormStore } from "./engine/store";
import { bindCreationColor, loadCreationColor, saveCreationColor } from "./creation-color";

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

const YELLOW = "#F7D000";
const PINK = "#FFC6E8";
const PURPLE = "#D3A1FF";
const camera = { x: 0, y: 0, zoom: 1 };
const board = (): StormBody => ({
  schema: 1,
  items: { a: { id: "a", type: "sticky", x: 0, y: 0, z: "a0", w: 200, h: 200, text: "" } },
});

describe("creation colour storage", () => {
  it("first use is Yellow", () => {
    stubStorage();
    expect(loadCreationColor("u1")).toBe(YELLOW);
  });

  it("round-trips per user", () => {
    const data = stubStorage();
    saveCreationColor("u1", PURPLE);
    expect(data["storm-sticky-color:u1"]).toBe(PURPLE);
    expect(loadCreationColor("u1")).toBe(PURPLE);
    expect(loadCreationColor("u2")).toBe(YELLOW);
  });

  it("a corrupt or non-preset value is Yellow", () => {
    for (const v of ["", "pink", "#123456", "#ffc6e8", '{"x":1}', "#FFDEB9"]) {
      stubStorage({ "storm-sticky-color:u1": v });
      expect(loadCreationColor("u1")).toBe(YELLOW);
    }
  });

  it("does not save a non-preset", () => {
    const data = stubStorage();
    saveCreationColor("u1", "#123456");
    expect(data).toEqual({});
  });

  it("storage that throws reads Yellow and writes nothing, without throwing", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(loadCreationColor("u1")).toBe(YELLOW);
    expect(() => saveCreationColor("u1", PINK)).not.toThrow();
  });

  it("no localStorage at all reads Yellow", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(loadCreationColor("u1")).toBe(YELLOW);
  });
});

describe("creation colour on the board", () => {
  it("recolouring a sticky pink: the next placed sticky is pink, and that survives a reload", () => {
    const data = stubStorage();
    const store = createStormStore({ body: board(), camera, creationColor: loadCreationColor("u1") });
    const unbind = bindCreationColor(store, "u1");
    store.setColor("a", PINK);
    const id = placeSticky(store, { x: 500, y: 0 });
    expect(store.getSnapshot().items[id].color).toBe(PINK);
    expect(data["storm-sticky-color:u1"]).toBe(PINK);
    unbind();

    // Reload: a new store reads the remembered colour.
    const reloaded = createStormStore({ body: board(), camera, creationColor: loadCreationColor("u1") });
    expect(reloaded.getSnapshot().creationColor).toBe(PINK);
    const next = placeSticky(reloaded, { x: 900, y: 0 });
    expect(reloaded.getSnapshot().items[next].color).toBe(PINK);
  });

  it("writes only when the creation colour changes", () => {
    const writes: string[] = [];
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: (_k: string, v: string) => writes.push(v) });
    const store = createStormStore({ body: board(), camera });
    bindCreationColor(store, "u1");
    store.select("a");
    store.setCamera({ x: 5, y: 5, zoom: 1 });
    expect(writes).toEqual([]);
    store.setCreationColor(PURPLE);
    store.setCreationColor(PURPLE);
    expect(writes).toEqual([PURPLE]);
  });
});
