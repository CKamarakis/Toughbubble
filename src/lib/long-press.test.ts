import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLongPress } from "./long-press";

describe("createLongPress", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires after the delay when held still", () => {
    const onLongPress = vi.fn();
    const press = createLongPress({ onLongPress });
    press.down(10, 10);
    vi.advanceTimersByTime(499);
    expect(onLongPress).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onLongPress).toHaveBeenCalledOnce();
  });

  it("is cancelled by an early release", () => {
    const onLongPress = vi.fn();
    const press = createLongPress({ onLongPress });
    press.down(10, 10);
    vi.advanceTimersByTime(300);
    press.end();
    vi.advanceTimersByTime(1000);
    expect(onLongPress).not.toHaveBeenCalled();
    expect(press.consumeClick()).toBe(false);
  });

  it("tolerates small movement but is cancelled by a larger one", () => {
    const onLongPress = vi.fn();
    const press = createLongPress({ onLongPress });
    press.down(10, 10);
    press.move(15, 14); // 6.4 px
    vi.advanceTimersByTime(500);
    expect(onLongPress).toHaveBeenCalledOnce();

    press.down(10, 10);
    press.move(10, 19); // 9 px, like the start of a scroll
    vi.advanceTimersByTime(1000);
    expect(onLongPress).toHaveBeenCalledOnce();
  });

  it("swallows exactly the one click after it fires", () => {
    const press = createLongPress({ onLongPress: () => {} });
    press.down(0, 0);
    vi.advanceTimersByTime(500);
    press.end();
    expect(press.consumeClick()).toBe(true);
    expect(press.consumeClick()).toBe(false);
  });

  it("forgets a fired press when a new one starts", () => {
    const press = createLongPress({ onLongPress: () => {} });
    press.down(0, 0);
    vi.advanceTimersByTime(500);
    press.down(0, 0);
    press.end();
    expect(press.consumeClick()).toBe(false);
  });
});
