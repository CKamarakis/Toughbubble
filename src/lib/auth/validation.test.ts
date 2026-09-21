import { describe, expect, it } from "vitest";
import { looksLikeEmail, passwordProblem } from "@/lib/auth/validation";

describe("passwordProblem", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(passwordProblem("")).toMatch(/at least 8/);
    expect(passwordProblem("1234567")).toMatch(/at least 8/);
  });

  it("accepts passwords of 8 or more characters", () => {
    expect(passwordProblem("12345678")).toBeNull();
    expect(passwordProblem("a much longer passphrase")).toBeNull();
  });
});

describe("looksLikeEmail", () => {
  it.each(["me@example.com", "first.last+tag@sub.example.co"])("accepts %s", (email) => {
    expect(looksLikeEmail(email)).toBe(true);
  });

  it.each(["", "me", "me@", "me@example", "me @example.com"])("rejects %j", (email) => {
    expect(looksLikeEmail(email)).toBe(false);
  });
});
