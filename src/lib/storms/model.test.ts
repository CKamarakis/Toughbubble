import { describe, expect, it } from "vitest";
import { boundsOf, byZ, topZ, type Item, type Items } from "./model";

const sticky = (id: string, x: number, y: number, z: string, w = 200, h = 200): Item => ({
  id,
  type: "sticky",
  x,
  y,
  z,
  w,
  h,
  text: "",
});

describe("topZ", () => {
  it("returns a key for an empty board", () => {
    expect(typeof topZ({})).toBe("string");
    expect(topZ({}).length).toBeGreaterThan(0);
  });

  it("is greater than every existing z", () => {
    const items: Items = { a: sticky("a", 0, 0, "a0"), b: sticky("b", 0, 0, "a5"), c: sticky("c", 0, 0, "Zz") };
    const z = topZ(items);
    for (const item of Object.values(items)) expect(z > item.z).toBe(true);
  });
});

describe("boundsOf", () => {
  it("is null for no items", () => {
    expect(boundsOf([])).toBeNull();
  });

  it("is the union rect of two stickies", () => {
    expect(boundsOf([sticky("a", 0, 0, "a0"), sticky("b", 300, -50, "a1", 100, 80)])).toEqual({
      x: 0,
      y: -50,
      w: 400,
      h: 250,
    });
  });
});

describe("byZ", () => {
  it("sorts ascending by code units", () => {
    const items = [sticky("a", 0, 0, "a1"), sticky("b", 0, 0, "Zz"), sticky("c", 0, 0, "a0")];
    expect(items.sort(byZ).map((i) => i.z)).toEqual(["Zz", "a0", "a1"]);
  });
});
