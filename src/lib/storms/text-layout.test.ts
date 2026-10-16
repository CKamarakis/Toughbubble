import { describe, expect, it } from "vitest";
import type { Sticky } from "./model";
import { fitFontSize, layoutSticky, maxLinesAt, scaleMeasure, wrapText, type SizedMeasure } from "./text-layout";

const measure = (s: string) => s.length * 10;
/** Every character is half the font size wide. */
const sized: SizedMeasure = (s, px) => s.length * px * 0.5;
const sticky = (text: string, over: Partial<Sticky> = {}): Sticky => ({
  id: "a",
  type: "sticky",
  x: 0,
  y: 0,
  z: "a0",
  w: 200,
  h: 200,
  text,
  ...over,
});
/** The inside of a 200 px sticky: 200 - 2 * 16 padding. */
const INNER = 168;

describe("wrapText", () => {
  it("wraps at spaces", () => {
    expect(wrapText(measure, "aaa bbb ccc", 70)).toEqual(["aaa bbb", "ccc"]);
  });
  it("honours \\n", () => {
    expect(wrapText(measure, "ab\n\ncd", 100)).toEqual(["ab", "", "cd"]);
  });
  it("breaks a long word", () => {
    expect(wrapText(measure, "abcdefghij", 40)).toEqual(["abcd", "efgh", "ij"]);
  });
  it("moves a long word to its own line before breaking it", () => {
    expect(wrapText(measure, "ab cdefgh", 40)).toEqual(["ab", "cdef", "gh"]);
  });

  // Matches a textarea with `white-space: pre-wrap; overflow-wrap: break-word`.
  it("keeps runs of spaces and leading spaces", () => {
    expect(wrapText(measure, "  a   b", 100)).toEqual(["  a   b"]);
  });
  it("hangs the spaces at a soft wrap: they end the line and are not drawn", () => {
    expect(wrapText(measure, "aaa   bbb", 50)).toEqual(["aaa", "bbb"]);
  });
  it("never wraps at spaces alone", () => {
    expect(wrapText(measure, "aaa     ", 50)).toEqual(["aaa  "]);
  });
  it("keeps trailing spaces that fit at a paragraph end", () => {
    expect(wrapText(measure, "ab  \ncd", 100)).toEqual(["ab  ", "cd"]);
  });
  it("can break after leading spaces", () => {
    expect(wrapText(measure, "   abcd", 50)).toEqual(["", "abcd"]);
  });
  it("an empty text is one empty line", () => {
    expect(wrapText(measure, "", 100)).toEqual([""]);
  });
});

describe("scaleMeasure", () => {
  it("scales a 100 px reference measure linearly", () => {
    const m = scaleMeasure((s) => s.length * 50);
    expect(m("ab", 100)).toBe(100);
    expect(m("ab", 20)).toBe(20);
  });
});

describe("fitFontSize", () => {
  const linesAt = (text: string, px: number) => wrapText((s) => sized(s, px), text, INNER);
  const fitsAt = (text: string, px: number) =>
    linesAt(text, px).length * px * 1.3 <= INNER && linesAt(text, px).every((l) => sized(l, px) <= INNER);

  it('"Hi" in a 200×200 sticky → 64', () => {
    expect(fitFontSize(sized, "Hi", 200, 200)).toBe(64);
  });

  it("empty text → 64", () => {
    expect(fitFontSize(sized, "", 200, 200)).toBe(64);
  });

  it("growing text shrinks monotonically, and each size fits", () => {
    const words = Array.from({ length: 100 }, (_, i) => `w${i}`).join(" ");
    let previous = 64;
    let shrank = false;
    for (let n = 1; n <= words.length; n++) {
      const text = words.slice(0, n);
      const size = fitFontSize(sized, text, 200, 200);
      expect(size).toBeLessThanOrEqual(previous);
      if (size < previous) shrank = true;
      previous = size;
      if (size > 8) expect(fitsAt(text, size)).toBe(true);
    }
    expect(shrank).toBe(true);
  });

  it("is the largest whole size that fits: one more doesn't", () => {
    const text = "Talk to users first and cut scope";
    const size = fitFontSize(sized, text, 200, 200);
    expect(Number.isInteger(size)).toBe(true);
    expect(size).toBeLessThan(64);
    expect(fitsAt(text, size)).toBe(true);
    expect(fitsAt(text, size + 1)).toBe(false);
  });

  it("500 characters → at least 8, clipped only at 8", () => {
    for (const text of ["x".repeat(500), "word ".repeat(100), "ab\n".repeat(166) + "ab", "a\n".repeat(250)]) {
      expect(text.length).toBeLessThanOrEqual(500);
      const size = fitFontSize(sized, text, 200, 200);
      expect(size).toBeGreaterThanOrEqual(8);
      const all = linesAt(text, size);
      const drawn = layoutSticky(sized, sticky(text)).lines;
      if (size > 8) expect(drawn).toEqual(all);
      else if (!fitsAt(text, 8)) expect(drawn.length).toBeLessThan(all.length);
    }
    // 250 lines can't fit at 8 px: drawn at 8 and clipped.
    const lines = "a\n".repeat(250);
    expect(fitFontSize(sized, lines, 200, 200)).toBe(8);
    expect(layoutSticky(sized, sticky(lines)).lines.length).toBeLessThan(250);
  });

  it("breaks a long word rather than overflowing", () => {
    const text = "x".repeat(40);
    const l = layoutSticky(sized, sticky(text));
    expect(l.lines.every((line) => sized(line, l.fontSize) <= INNER)).toBe(true);
    expect(l.lines.join("")).toBe(text);
  });
});

describe("one fit rule", () => {
  it("5 lines at 12 px fit a 110 px high sticky (78 px inside), and all 5 are drawn", () => {
    expect(maxLinesAt(12, 110)).toBe(5);
    const text = "a\nb\nc\nd\ne";
    const narrow: SizedMeasure = (s, px) => s.length * px * 0.5;
    // Wide enough that 13 px would fit by width; 5 × 13 × 1.3 = 84.5 > 78 doesn't by height.
    expect(fitFontSize(narrow, text, 200, 110)).toBe(12);
    expect(layoutSticky(narrow, sticky(text, { h: 110 })).lines).toHaveLength(5);
  });

  it("n lines that exactly fill the inside are all drawn, for every size 8-64", () => {
    for (let f = 8; f <= 64; f++) {
      for (let n = 1; n <= 20; n++) {
        // The inside height as a sticky would store it: whole hundredths of a px.
        const h = Math.round(n * f * 13) / 10 + 32;
        expect(maxLinesAt(f, h)).toBe(n);
        const text = Array.from({ length: n }, () => "a").join("\n");
        expect(layoutSticky(sized, sticky(text, { h, fontSize: f })).lines).toHaveLength(n);
      }
    }
  });
});

describe("layoutSticky", () => {
  it("centres one line", () => {
    const l = layoutSticky(measure, sticky("hi", { fontSize: 20 }));
    expect(l.lines).toEqual(["hi"]);
    expect(l.lineHeight).toBe(26);
    expect(l.top).toBe((200 - 26) / 2);
  });
  it("drops lines that overflow", () => {
    const l = layoutSticky(measure, sticky(Array(20).fill("x").join("\n"), { fontSize: 20 }));
    expect(l.lines).toHaveLength(6);
    expect(l.top).toBe((200 - 6 * 26) / 2);
  });
  it("uses a stored fontSize as is", () => {
    const l = layoutSticky(sized, sticky("Hi", { fontSize: 12 }));
    expect(l.fontSize).toBe(12);
    expect(l.lineHeight).toBeCloseTo(12 * 1.3);
  });
  it("fits a sticky with no stored size", () => {
    const l = layoutSticky(sized, sticky("Hi"));
    expect(l.fontSize).toBe(64);
    expect(l.lineHeight).toBeCloseTo(64 * 1.3);
    expect(l.top).toBeCloseTo((200 - 64 * 1.3) / 2);
  });
});
