import { describe, expect, it } from "vitest";
import { DEFAULT_STICKY_COLOR, PRESET_HEXES, STICKY_COLORS, colorOf, currentHex, inkFor } from "./palette";

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
  it("has the 13 presets in table order (D5)", () => {
    expect(STICKY_COLORS.map((c) => `${c.name} ${c.hex} ${c.ink}`)).toEqual([
      "Yellow #F7D000 #333129",
      "Light yellow #FFF0A0 #333129",
      "Pink #FFC6E8 #333129",
      "Magenta #FF8AD8 #333129",
      "Lavender #F3DDFF #333129",
      "Purple #D3A1FF #333129",
      "Sky blue #BBF0FF #333129",
      "Light blue #B3CEFF #333129",
      "Dark blue #3263C3 #FFFFFF",
      "Light green #D4F3C4 #333129",
      "Dark green #008135 #FFFFFF",
      "Black #141310 #FFFFFF",
      "White #FFFFFF #333129",
    ]);
    expect(PRESET_HEXES.size).toBe(13);
    expect(new Set(STICKY_COLORS.map((c) => c.id)).size).toBe(13);
  });
  it("the first palette's removed colours map to the nearest preset; others pass through", () => {
    expect(currentHex("#FFDEB9")).toBe("#FFF0A0"); // Orange -> Light yellow
    expect(currentHex("#FFD7CF")).toBe("#FFC6E8"); // Red -> Pink
    expect(currentHex("#FFD5EE")).toBe("#FFC6E8"); // the earlier Pink -> Pink
    expect(currentHex("#E7CBB9")).toBe("#FFF0A0"); // Brown -> Light yellow
    expect(currentHex("#ffdeb9")).toBe("#FFF0A0");
    expect(currentHex("#3263C3")).toBe("#3263C3");
    expect(currentHex("#123456")).toBe("#123456");
    for (const old of ["#FFDEB9", "#FFD7CF", "#FFD5EE", "#E7CBB9"]) expect(PRESET_HEXES.has(old)).toBe(false);
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
