import { describe, expect, it } from "vitest";
import { decideRoute } from "@/lib/auth/routing";

const GUEST_PAGES = ["/sign-in", "/sign-up", "/forgot-password"];
const AUTH_ROUTES = ["/auth/callback", "/auth/confirm", "/auth/sign-out"];

describe("decideRoute", () => {
  it("sends a visitor without a session to sign-in, remembering the page", () => {
    expect(decideRoute("/notes/abc", "?x=1", false)).toEqual({
      type: "redirect",
      to: "/sign-in?next=%2Fnotes%2Fabc%3Fx%3D1",
    });
  });

  it("omits next for the workspace root", () => {
    expect(decideRoute("/", "", false)).toEqual({ type: "redirect", to: "/sign-in" });
  });

  it("sends a signed-in user away from sign-in, sign-up, and forgot-password", () => {
    for (const path of GUEST_PAGES) {
      expect(decideRoute(path, "", true)).toEqual({ type: "redirect", to: "/" });
    }
  });

  it("lets a visitor without a session reach the guest pages and auth routes", () => {
    for (const path of [...GUEST_PAGES, ...AUTH_ROUTES]) {
      expect(decideRoute(path, "", false)).toEqual({ type: "next", isProtected: false });
    }
  });

  it("lets a signed-in user use the auth routes (email links, sign-out)", () => {
    for (const path of AUTH_ROUTES) {
      expect(decideRoute(path, "", true)).toEqual({ type: "next", isProtected: false });
    }
  });

  it("requires a session for reset-password", () => {
    expect(decideRoute("/reset-password", "", false)).toEqual({
      type: "redirect",
      to: "/sign-in?next=%2Freset-password",
    });
    expect(decideRoute("/reset-password", "", true)).toEqual({ type: "next", isProtected: true });
  });

  it("does not treat look-alike paths as public", () => {
    expect(decideRoute("/sign-in-other", "", false).type).toBe("redirect");
    expect(decideRoute("/auth/callbackx", "", false).type).toBe("redirect");
  });

  it("lets a signed-in user through to workspace pages", () => {
    expect(decideRoute("/notes/abc", "", true)).toEqual({ type: "next", isProtected: true });
  });
});
