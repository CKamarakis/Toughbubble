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
