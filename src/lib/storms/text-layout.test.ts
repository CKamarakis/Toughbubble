import { describe, expect, it } from "vitest";
import type { Sticky } from "./model";
import { layoutSticky, wrapText } from "./text-layout";

const measure = (s: string) => s.length * 10;
const sticky = (text: string): Sticky => ({
  id: "a",
  type: "sticky",
  x: 0,
  y: 0,
  z: "a0",
  w: 200,
  h: 200,
  text,
});

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

describe("layoutSticky", () => {
  it("centres one line", () => {
    const l = layoutSticky(measure, sticky("hi"));
    expect(l.lines).toEqual(["hi"]);
    expect(l.lineHeight).toBe(26);
    expect(l.top).toBe((200 - 26) / 2);
  });
  it("drops lines that overflow", () => {
    const l = layoutSticky(measure, sticky(Array(20).fill("x").join("\n")));
    expect(l.lines).toHaveLength(6);
    expect(l.top).toBe((200 - 6 * 26) / 2);
  });
});
