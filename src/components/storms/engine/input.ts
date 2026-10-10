import { fitCamera, HOME_CAMERA, panBy, stepZoom, zoomAt } from "@/lib/storms/camera";
import { boundsOf, type Point, type Size } from "@/lib/storms/model";
import { createWheelClassifier } from "@/lib/storms/wheel-source";
import type { StormStore, Tool } from "./store";

export type ZoomKeyAction = "zoom-in" | "zoom-out" | "zoom-reset" | "fit";

type KeyLike = {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

/** Maps a key press to a camera action, or null when it is not one of ours. */
export function zoomKeyAction(e: KeyLike): ZoomKeyAction | null {
  const mod = e.ctrlKey || e.metaKey;
  if (mod) {
    if (e.key === "=" || e.key === "+") return "zoom-in";
    if (e.key === "-") return "zoom-out";
    if (e.key === "0") return "zoom-reset";
    return null;
  }
  if (e.shiftKey && e.code === "Digit1") return "fit";
  return null;
}

/** V picks the select tool, N the sticky tool; any modifier cancels it. */
function toolKey(e: KeyboardEvent): Tool | null {
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return null;
  const k = e.key.toLowerCase();
  if (k === "v") return "select";
  if (k === "n") return "sticky";
  return null;
}

function isEditable(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
}

const WHEEL_ZOOM_RATE = 0.0015;
const LINE_MODE_FACTOR = 20;

type Drag = { pointerId: number; button: number; x: number; y: number };

type GestureEvent = Event & { scale: number; clientX?: number; clientY?: number };

/**
 * Attaches camera input (wheel, pinch, pan, zoom keys) to the board element.
 * Returns a function that removes every listener.
 */
export function attachInput(
  el: HTMLElement,
  store: StormStore,
  getViewport: () => Size,
): () => void {
  const classify = createWheelClassifier();
  let spaceDown = false;
  let drag: Drag | null = null;
  let gestureStartZoom = 1;

  /** Point relative to the board element. */
  const local = (clientX: number, clientY: number): Point => {
    const r = el.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };
  const centre = (): Point => {
    const vp = getViewport();
    return { x: vp.w / 2, y: vp.h / 2 };
  };
  const camera = () => store.getSnapshot().camera;
  const zoomTo = (at: Point, zoom: number) =>
    store.setCamera(zoomAt(camera(), getViewport(), at, zoom));
  const panScreen = (dx: number, dy: number) => store.setCamera(panBy(camera(), dx, dy));

  const updateCursor = () => {
    el.style.cursor = spaceDown ? (drag ? "grabbing" : "grab") : "";
  };

  // --- wheel -------------------------------------------------------------
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (classify(e, e.timeStamp) === "pan") {
      panScreen(-e.deltaX, -e.deltaY);
      return;
    }
    const delta = e.deltaMode === 1 ? e.deltaY * LINE_MODE_FACTOR : e.deltaY;
    zoomTo(local(e.clientX, e.clientY), camera().zoom * Math.exp(-delta * WHEEL_ZOOM_RATE));
  };

  // --- Safari pinch ------------------------------------------------------
  const onGestureStart = (e: Event) => {
    e.preventDefault();
    gestureStartZoom = camera().zoom;
  };
  const onGestureChange = (e: Event) => {
    e.preventDefault();
    const g = e as GestureEvent;
    const at = g.clientX === undefined ? centre() : local(g.clientX, g.clientY ?? 0);
    zoomTo(at, gestureStartZoom * g.scale);
  };

  // --- pointer: one handler per button ------------------------------------
  /** Starts a pan drag. Later tasks add sticky handlers for the left button. */
  const startPan = (e: PointerEvent) => {
    drag = { pointerId: e.pointerId, button: e.button, x: e.clientX, y: e.clientY };
    el.setPointerCapture(e.pointerId);
    updateCursor();
  };
  const buttonHandlers: Record<number, (e: PointerEvent) => void> = {
    0: (e) => {
      if (spaceDown) startPan(e);
    },
    2: startPan,
  };

  const onPointerDown = (e: PointerEvent) => {
    el.focus({ preventScroll: true });
    buttonHandlers[e.button]?.(e);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    panScreen(e.clientX - drag.x, e.clientY - drag.y);
    drag.x = e.clientX;
    drag.y = e.clientY;
  };
  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    drag = null;
    updateCursor();
  };
  const onContextMenu = (e: Event) => e.preventDefault();

  // --- keys --------------------------------------------------------------
  const focusInside = () => el.contains(document.activeElement);

  const onKeyDown = (e: KeyboardEvent) => {
    if (!focusInside()) return;
    if (store.getSnapshot().editingId || isEditable(e.target)) return;
    if (e.key === " ") {
      e.preventDefault();
      if (!e.repeat && !spaceDown) {
        spaceDown = true;
        updateCursor();
      }
      return;
    }
    const tool = toolKey(e);
    if (tool) {
      e.preventDefault();
      store.setTool(tool);
      return;
    }
    const action = zoomKeyAction(e);
    if (!action) return;
    e.preventDefault();
    const vp = getViewport();
    const cam = camera();
    if (action === "zoom-in") store.setCamera(stepZoom(cam, vp, 1));
    else if (action === "zoom-out") store.setCamera(stepZoom(cam, vp, -1));
    else if (action === "zoom-reset") zoomTo(centre(), 1);
    else {
      const items = Object.values(store.getSnapshot().items);
      store.setCamera(items.length ? fitCamera(boundsOf(items), vp) : { ...HOME_CAMERA });
    }
  };
  const endSpace = () => {
    if (!spaceDown) return;
    spaceDown = false;
    updateCursor();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === " ") endSpace();
  };

  el.addEventListener("wheel", onWheel, { passive: false });
  el.addEventListener("gesturestart", onGestureStart);
  el.addEventListener("gesturechange", onGestureChange);
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", endDrag);
  el.addEventListener("pointercancel", endDrag);
  el.addEventListener("contextmenu", onContextMenu);
  el.addEventListener("keydown", onKeyDown);
  el.addEventListener("blur", endSpace, true);
  window.addEventListener("keyup", onKeyUp);

  return () => {
    el.removeEventListener("wheel", onWheel);
    el.removeEventListener("gesturestart", onGestureStart);
    el.removeEventListener("gesturechange", onGestureChange);
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", endDrag);
    el.removeEventListener("pointercancel", endDrag);
    el.removeEventListener("contextmenu", onContextMenu);
    el.removeEventListener("keydown", onKeyDown);
    el.removeEventListener("blur", endSpace, true);
    window.removeEventListener("keyup", onKeyUp);
    el.style.cursor = "";
  };
}
