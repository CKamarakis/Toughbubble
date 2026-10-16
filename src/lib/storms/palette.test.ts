import { describe, expect, it } from "vitest";
import { DEFAULT_STICKY_COLOR, PRESET_HEXES, STICKY_COLORS, colorOf, inkFor } from "./palette";

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("palette", () => {
  it("has the 12 presets in table order", () => {
    expect(STICKY_COLORS.map((c) => c.name)).toEqual([
      "Yellow", "Orange", "Red", "Pink", "Purple", "Light blue",
      "Dark blue", "Light green", "Dark green", "Brown", "Black", "White",
    ]);
    expect(PRESET_HEXES.size).toBe(12);
    expect(new Set(STICKY_COLORS.map((c) => c.id)).size).toBe(12);
  });
  it.each(STICKY_COLORS.map((c) => [c.name, c] as const))("%s text has contrast >= 4.5", (_n, c) => {
    expect(ratio(c.hex, c.ink)).toBeGreaterThanOrEqual(4.5);
    expect(inkFor(c.hex)).toBe(c.ink);
  });
  it("stores hexes upper case", () => {
    for (const c of STICKY_COLORS) expect(c.hex).toBe(c.hex.toUpperCase());
  });
  it("a missing colour resolves to Yellow", () => {
    expect(DEFAULT_STICKY_COLOR).toBe("#F7D000");
    expect(colorOf({}).name).toBe("Yellow");
    expect(colorOf({ color: undefined }).hex).toBe("#F7D000");
    expect(colorOf({ color: "#3263C3" }).name).toBe("Dark blue");
  });
  it("an unknown colour falls back to Yellow", () => {
    expect(colorOf({ color: "#123456" }).name).toBe("Yellow");
  });
  it("inkFor an unknown hex picks a readable ink", () => {
    expect(inkFor("#000000")).toBe("#FFFFFF");
    expect(inkFor("#FFFFFF")).toBe("#333129");
  });
});
