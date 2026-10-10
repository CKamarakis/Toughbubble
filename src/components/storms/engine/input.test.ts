import { describe, expect, it } from "vitest";
import { zoomKeyAction } from "./input";

const k = (key: string, over: Partial<Parameters<typeof zoomKeyAction>[0]> = {}) => ({
  key,
  code: "",
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...over,
});

describe("zoomKeyAction", () => {
  it("maps Ctrl/Cmd + = or + to zoom-in", () => {
    expect(zoomKeyAction(k("=", { ctrlKey: true }))).toBe("zoom-in");
    expect(zoomKeyAction(k("+", { metaKey: true, shiftKey: true }))).toBe("zoom-in");
  });
  it("maps Ctrl/Cmd + - to zoom-out and 0 to zoom-reset", () => {
    expect(zoomKeyAction(k("-", { ctrlKey: true }))).toBe("zoom-out");
    expect(zoomKeyAction(k("0", { metaKey: true }))).toBe("zoom-reset");
  });
  it("maps Shift + Digit1 to fit, even when key is !", () => {
    expect(zoomKeyAction(k("!", { code: "Digit1", shiftKey: true }))).toBe("fit");
  });
  it("ignores plain keys and Ctrl+Shift+Digit1", () => {
    expect(zoomKeyAction(k("="))).toBeNull();
    expect(zoomKeyAction(k("1", { code: "Digit1" }))).toBeNull();
    expect(zoomKeyAction(k("!", { code: "Digit1", shiftKey: true, ctrlKey: true }))).toBeNull();
    expect(zoomKeyAction(k("a", { ctrlKey: true }))).toBeNull();
  });
});
