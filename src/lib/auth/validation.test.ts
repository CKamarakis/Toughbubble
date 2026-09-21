import { describe, expect, it } from "vitest";
import { looksLikeEmail, passwordProblem } from "@/lib/auth/validation";

describe("passwordProblem", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(passwordProblem("")).toMatch(/at least 8/);
    expect(passwordProblem("Ab1!xyz")).toMatch(/at least 8/);
  });

  it("names every missing character type", () => {
    expect(passwordProblem("abcdefgh")).toBe(
      "Your password needs an uppercase letter, a number and a symbol.",
    );
    expect(passwordProblem("Abcdefg1")).toBe("Your password needs a symbol.");
    expect(passwordProblem("ABCDEFG1!")).toBe("Your password needs a lowercase letter.");
  });

  it("only counts the symbols Supabase counts", () => {
    expect(passwordProblem("Abcdefg1 ")).toBe("Your password needs a symbol.");
    expect(passwordProblem("Abcdefg1é")).toBe("Your password needs a symbol.");
    for (const symbol of ["!", "#", "\\", '"', "`", "~", "["]) {
      expect(passwordProblem(`Abcdefg1${symbol}`)).toBeNull();
    }
  });

  it("accepts a password meeting every rule", () => {
    expect(passwordProblem("Long-enough-123!")).toBeNull();
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
