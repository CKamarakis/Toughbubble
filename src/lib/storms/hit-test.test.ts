import { describe, expect, it } from "vitest";
import { hitTest } from "./hit-test";
import type { Item, Items } from "./model";

const sticky = (id: string, x: number, y: number, z: string): Item => ({
  id, type: "sticky", x, y, z, w: 200, h: 200, text: "",
});
const board = (...items: Item[]): Items => Object.fromEntries(items.map((i) => [i.id, i]));

describe("hitTest", () => {
  it("overlapping returns the higher z", () => {
    const items = board(sticky("a", 0, 0, "a1"), sticky("b", 100, 100, "a2"));
    expect(hitTest(items, { x: 150, y: 150 })?.id).toBe("b");
    const flipped = board(sticky("a", 0, 0, "a2"), sticky("b", 100, 100, "a1"));
    expect(hitTest(flipped, { x: 150, y: 150 })?.id).toBe("a");
  });

  it("empty space returns null", () => {
    expect(hitTest(board(sticky("a", 0, 0, "a1")), { x: 500, y: 500 })).toBeNull();
    expect(hitTest({}, { x: 0, y: 0 })).toBeNull();
  });

  it("edges are inclusive", () => {
    const items = board(sticky("a", 0, 0, "a1"));
    expect(hitTest(items, { x: 0, y: 0 })?.id).toBe("a");
    expect(hitTest(items, { x: 200, y: 200 })?.id).toBe("a");
    expect(hitTest(items, { x: 200.5, y: 100 })).toBeNull();
  });
});
