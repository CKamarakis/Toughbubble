import { describe, expect, it } from "vitest";
import { PINCH_ZOOM_FACTOR, routeKey, wheelZoomScale, zoomKeyAction } from "./input";

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

describe("routeKey", () => {
  const idle = { editingId: null, selectedId: null, tool: "select" as const };
  const sel = { ...idle, selectedId: "a" };
  const editing = { ...sel, editingId: "a" };
  const key = (key: string, over: Partial<Parameters<typeof routeKey>[1]> = {}) => ({
    key,
    code: "",
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...over,
  });

  it("board shortcuts are ignored while editing", () => {
    const keys = [
      key("Delete"),
      key("Backspace"),
      key("Enter"),
      key("ArrowLeft"),
      key("n"),
      key(" "),
      key("z", { ctrlKey: true }),
      key("z", { metaKey: true, shiftKey: true }),
      key("y", { ctrlKey: true }),
      key("=", { ctrlKey: true }),
      key("!", { code: "Digit1", shiftKey: true }),
    ];
    for (const e of keys) {
      expect(routeKey(sel, e)).not.toBeNull();
      expect(routeKey(editing, e)).toBeNull();
    }
  });

  it("Delete and Backspace delete the selection, and need one", () => {
    expect(routeKey(sel, key("Delete"))).toBe("delete");
    expect(routeKey(sel, key("Backspace"))).toBe("delete");
    expect(routeKey(idle, key("Delete"))).toBeNull();
    expect(routeKey(sel, key("Backspace", { ctrlKey: true }))).toBeNull();
  });

  it("Enter edits the selection", () => {
    expect(routeKey(sel, key("Enter"))).toBe("edit");
    expect(routeKey(idle, key("Enter"))).toBeNull();
    expect(routeKey(sel, key("Enter", { shiftKey: true }))).toBeNull();
  });

  it("maps undo and redo", () => {
    expect(routeKey(idle, key("z", { ctrlKey: true }))).toBe("undo");
    expect(routeKey(idle, key("z", { metaKey: true }))).toBe("undo");
    expect(routeKey(idle, key("Z", { ctrlKey: true, shiftKey: true }))).toBe("redo");
    expect(routeKey(idle, key("z", { metaKey: true, shiftKey: true }))).toBe("redo");
    expect(routeKey(idle, key("y", { ctrlKey: true }))).toBe("redo");
    expect(routeKey(idle, key("z"))).toBeNull();
  });

  it("maps tools, nudges, space and zoom", () => {
    expect(routeKey(idle, key("V"))).toBeNull();
    expect(routeKey({ ...idle, tool: "sticky" as const }, key("Escape"))).toBe("tool-off");
    expect(routeKey(idle, key("Escape"))).toBeNull();
    expect(routeKey({ ...idle, tool: "sticky" as const, editingId: "a" }, key("Escape"))).toBeNull();
    expect(routeKey(idle, key("n"))).toBe("tool-sticky");
    expect(routeKey(idle, key("n", { ctrlKey: true }))).toBeNull();
    expect(routeKey(sel, key("ArrowUp"))).toBe("nudge");
    expect(routeKey(idle, key("ArrowUp"))).toBeNull();
    expect(routeKey({ ...sel, tool: "sticky" }, key("ArrowUp"))).toBeNull();
    expect(routeKey(idle, key(" "))).toBe("space");
    expect(routeKey(idle, key("-", { ctrlKey: true }))).toBe("zoom-out");
    expect(routeKey(idle, key("!", { code: "Digit1", shiftKey: true }))).toBe("fit");
    expect(routeKey(idle, key("q"))).toBeNull();
  });
});

describe("wheelZoomScale", () => {
  const ev = (deltaY: number, o: object = {}) => ({
    deltaY,
    deltaMode: 0,
    ctrlKey: true,
    metaKey: false,
    ...o,
  });
  const logZoom = (events: ReturnType<typeof ev>[]) =>
    events.reduce((sum, e) => sum + Math.log(wheelZoomScale(e)), 0);

  it("a typical pinch zooms 2.5x more (log zoom) than the old rate", () => {
    const pinch = [-4.5, -8.25, -12.5, -9.75, -6.5, -3.25, -1.5].map((d) => ev(d));
    const oldLog = pinch.reduce((s, e) => s + -e.deltaY * 0.0015, 0);
    expect(logZoom(pinch) / oldLog).toBeCloseTo(2.5, 5);
    expect(PINCH_ZOOM_FACTOR).toBeCloseTo(0.0015 * 2.5, 10);
  });

  it("a fractional Ctrl+wheel notch (display scaling) uses the plain wheel rate", () => {
    expect(wheelZoomScale(ev(-133.33))).toBeCloseTo(Math.exp(133.33 * 0.0015), 10);
    expect(wheelZoomScale(ev(66.67))).toBeCloseTo(Math.exp(-66.67 * 0.0015), 10);
  });

  it("a single pinch event never changes zoom by more than 1.25x", () => {
    for (const d of [-49.9, 49.9, -30, 30]) {
      const s = wheelZoomScale(ev(d));
      expect(s).toBeLessThanOrEqual(1.25);
      expect(s).toBeGreaterThanOrEqual(1 / 1.25);
    }
  });

  it("leaves the mouse wheel and Ctrl+mouse-wheel unchanged", () => {
    expect(wheelZoomScale(ev(-100, { ctrlKey: false }))).toBeCloseTo(Math.exp(0.15), 10);
    expect(wheelZoomScale(ev(-100))).toBeCloseTo(Math.exp(0.15), 10);
    expect(wheelZoomScale(ev(-3, { deltaMode: 1 }))).toBeCloseTo(Math.exp(3 * 20 * 0.0015), 10);
  });
});
