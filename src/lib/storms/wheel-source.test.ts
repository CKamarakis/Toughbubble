import { describe, expect, it } from "vitest";
import { createWheelClassifier, type WheelLike } from "./wheel-source";

const ev = (over: Partial<WheelLike> = {}): WheelLike => ({
  deltaX: 0,
  deltaY: 0,
  deltaMode: 0,
  ctrlKey: false,
  metaKey: false,
  ...over,
});

describe("createWheelClassifier", () => {
  it("line-mode wheel zooms", () => {
    const c = createWheelClassifier();
    expect(c(ev({ deltaMode: 1, deltaY: 3 }), 0)).toBe("zoom");
  });

  it("pixel deltaY 100 (integer) zooms", () => {
    const c = createWheelClassifier();
    expect(c(ev({ deltaY: 100 }), 0)).toBe("zoom");
  });

  it("pixel deltaY 3.5 pans", () => {
    const c = createWheelClassifier();
    expect(c(ev({ deltaY: 3.5 }), 0)).toBe("pan");
  });

  it("small integer pixel deltaY (<50) pans", () => {
    const c = createWheelClassifier();
    expect(c(ev({ deltaY: 4 }), 0)).toBe("pan");
  });

  it("horizontal delta pans", () => {
    const c = createWheelClassifier();
    expect(c(ev({ deltaX: 20, deltaY: 100 }), 0)).toBe("pan");
  });

  it("ctrl or meta zooms even mid pan gesture, without breaking the lock", () => {
    const c = createWheelClassifier();
    expect(c(ev({ deltaY: 3.5 }), 0)).toBe("pan");
    expect(c(ev({ deltaY: 3.5, ctrlKey: true }), 10)).toBe("zoom");
    expect(c(ev({ deltaY: 3.5, metaKey: true }), 20)).toBe("zoom");
    expect(c(ev({ deltaY: 100 }), 30)).toBe("pan");
  });

  it("ctrl events refresh the idle timer", () => {
    const c = createWheelClassifier();
    c(ev({ deltaY: 3.5 }), 0);
    c(ev({ deltaY: 3.5, ctrlKey: true }), 100);
    expect(c(ev({ deltaY: 100 }), 200)).toBe("pan");
  });

  it("locks: a trackpad gesture with one large delta stays pan", () => {
    const c = createWheelClassifier();
    expect(c(ev({ deltaY: 3.5 }), 0)).toBe("pan");
    expect(c(ev({ deltaY: 120 }), 16)).toBe("pan");
  });

  it("locks: a mouse gesture with a small delta stays zoom", () => {
    const c = createWheelClassifier();
    expect(c(ev({ deltaY: 100 }), 0)).toBe("zoom");
    expect(c(ev({ deltaY: 3.5 }), 16)).toBe("zoom");
  });

  it("after the idle window a new gesture re-classifies", () => {
    const c = createWheelClassifier(150);
    expect(c(ev({ deltaY: 3.5 }), 0)).toBe("pan");
    expect(c(ev({ deltaY: 100 }), 149)).toBe("pan");
    // refreshed at 149; exactly idleMs later starts a new gesture
    expect(c(ev({ deltaY: 100 }), 299)).toBe("zoom");
  });
});
