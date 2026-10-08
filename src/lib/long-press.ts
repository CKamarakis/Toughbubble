/**
 * Long-press detection, independent of the DOM (shell-hardening D3). A press
 * fires after `delay` ms unless it is released, cancelled, or moves further
 * than `tolerance` px first. After it fires, the click that the release
 * produces is swallowed once, so the long press doesn't also activate the row.
 */
export function createLongPress({
  onLongPress,
  delay = 500,
  tolerance = 8,
}: {
  onLongPress: () => void;
  delay?: number;
  tolerance?: number;
}) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let start: { x: number; y: number } | null = null;
  let fired = false;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    start = null;
  };

  return {
    down(x: number, y: number) {
      clear();
      fired = false;
      start = { x, y };
      timer = setTimeout(() => {
        timer = null;
        start = null;
        fired = true;
        onLongPress();
      }, delay);
    },
    move(x: number, y: number) {
      if (start && Math.hypot(x - start.x, y - start.y) > tolerance) clear();
    },
    /** Release or cancel before the delay: no long press. */
    end() {
      clear();
    },
    /** True once for the click that follows a fired long press. */
    consumeClick() {
      if (!fired) return false;
      fired = false;
      return true;
    },
  };
}
