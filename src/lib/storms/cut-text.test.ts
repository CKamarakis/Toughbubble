import { describe, expect, it } from "vitest";
import { cutText, isWellFormedText } from "./cut-text";

describe("cutText", () => {
  it("returns short text unchanged", () => {
    expect(cutText("hello", 500)).toBe("hello");
  });
  it("cuts plain text at max", () => {
    expect(cutText("x".repeat(800), 500)).toHaveLength(500);
  });
  it("drops half an emoji at the cut", () => {
    const out = cutText("a".repeat(499) + "😀tail", 500);
    expect(out).toBe("a".repeat(499));
    expect(isWellFormedText(out)).toBe(true);
  });
  it("keeps a whole emoji that fits", () => {
    const out = cutText("a".repeat(498) + "😀tail", 500);
    expect(out).toBe("a".repeat(498) + "😀");
  });
});

describe("isWellFormedText", () => {
  it("detects lone surrogates", () => {
    expect(isWellFormedText("ok 😀")).toBe(true);
    expect(isWellFormedText("a\ud83d")).toBe(false);
    expect(isWellFormedText("\ude00a")).toBe(false);
  });
});
