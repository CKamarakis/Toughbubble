import { describe, expect, it } from "vitest";
import { dotStride } from "./dots";

describe("dotStride", () => {
  it("draws every dot when they are far enough apart on screen", () => {
    expect(dotStride(1, 24, 12)).toBe(1);
    expect(dotStride(0.5, 24, 12)).toBe(1);
  });

  it("doubles the stride until dots are at least minPx apart", () => {
    expect(dotStride(0.3, 24, 12)).toBe(2); // 7.2px -> 14.4px
    expect(dotStride(0.21, 24, 12)).toBe(4); // 5.04px -> 20.2px
  });

  it("keeps the on-screen dot count bounded just above the no-dots zoom", () => {
    const zoom = 0.21;
    const perAxis = (1440 / zoom / 24) / dotStride(zoom, 24, 12);
    expect(perAxis).toBeLessThan(1440 / 12);
  });
});
