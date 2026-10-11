import { describe, expect, it } from "vitest";
import { makeBenchBoard } from "./bench-board";
import { STICKY } from "./model";

describe("makeBenchBoard", () => {
  it("makes the requested number of stickies on a grid with unique ids and z keys", () => {
    const body = makeBenchBoard(1000);
    const items = Object.values(body.items);
    expect(items).toHaveLength(1000);
    expect(new Set(items.map((s) => s.z)).size).toBe(1000);
    expect(new Set(items.map((s) => `${s.x},${s.y}`)).size).toBe(1000);
    for (const s of items) {
      expect(s.w).toBe(STICKY.size);
      expect(s.text.split("\n").length).toBeGreaterThanOrEqual(1);
      expect(s.text.split("\n").length).toBeLessThanOrEqual(3);
    }
  });

  it("is deterministic", () => {
    expect(makeBenchBoard(50)).toEqual(makeBenchBoard(50));
  });
});
