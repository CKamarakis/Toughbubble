export type WheelLike = {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
  metaKey: boolean;
};

export type WheelKind = "zoom" | "pan";

const LINE_MODE = 1;
const PIXEL_MODE = 0;
const MOUSE_NOTCH_PX = 50;

function classifyFirst(e: WheelLike): WheelKind {
  if (e.deltaMode === LINE_MODE) return "zoom";
  if (e.deltaX !== 0) return "pan";
  if (
    e.deltaMode === PIXEL_MODE &&
    (Math.abs(e.deltaY) < MOUSE_NOTCH_PX || !Number.isInteger(e.deltaY))
  ) {
    return "pan";
  }
  return "zoom";
}

/**
 * Tells a mouse wheel (zoom) from a trackpad scroll (pan). The first plain
 * event of a gesture decides, and the kind stays locked until `idleMs` passes
 * without events. Ctrl/meta events (pinch) always zoom, leave the lock alone,
 * and still refresh the idle timer.
 */
export function createWheelClassifier(
  idleMs = 150,
): (e: WheelLike, now: number) => WheelKind {
  let locked: WheelKind | null = null;
  let lastEventTime = -Infinity;

  return (e, now) => {
    const withinGesture = now - lastEventTime < idleMs;
    lastEventTime = now;
    if (!withinGesture) locked = null;
    if (e.ctrlKey || e.metaKey) return "zoom";
    if (locked === null) locked = classifyFirst(e);
    return locked;
  };
}
