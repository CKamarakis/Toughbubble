import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  it.each([
    ["/", "/"],
    ["/notes/123", "/notes/123"],
    ["/notes/123?tab=a#top", "/notes/123?tab=a#top"],
  ])("keeps relative path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["notes/123"],
    ["https://evil.example/phish"],
    ["//evil.example/phish"],
    ["/\\evil.example/phish"],
    ["javascript:alert(1)"],
  ])("rejects %s", (input) => {
    expect(safeNextPath(input)).toBe("/");
  });
});
