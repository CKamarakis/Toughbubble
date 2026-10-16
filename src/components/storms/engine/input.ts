import {
  fitCamera,
  HOME_CAMERA,
  panBy,
  screenToBoard,
  stepZoom,
  zoomAt,
} from "@/lib/storms/camera";
import { edgePanSpeed } from "@/lib/storms/edge-pan";
import { hitTest } from "@/lib/storms/hit-test";
import { boundsOf, type Point, type Size } from "@/lib/storms/model";
import { createWheelClassifier } from "@/lib/storms/wheel-source";
import { deleteSelected, moveSticky, nudge, placeSticky } from "./actions";
import type { Snapshot, StormStore } from "./store";

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

const ARROWS: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

export type KeyAction =
  | ZoomKeyAction
  | "space"
  | "nudge"
  | "delete"
  | "edit"
  | "undo"
  | "redo"
  | "tool-off"
  | "tool-sticky";

/**
 * Maps a key press on the board to an action, or null when it is not one of ours.
 * Everything is null while a sticky's text is being edited, so the textarea gets it.
 */
export function routeKey(
  snap: Pick<Snapshot, "editingId" | "selectedId" | "tool">,
  e: KeyLike & { altKey: boolean },
): KeyAction | null {
  if (snap.editingId) return null;
  const mod = e.ctrlKey || e.metaKey;
  const plain = !mod && !e.altKey && !e.shiftKey;
  const k = e.key.toLowerCase();
  if (e.key === " ") return "space";
  if (ARROWS[e.key]) {
    return snap.tool === "select" && snap.selectedId && !mod && !e.altKey ? "nudge" : null;
  }
  if (e.key === "Delete" || e.key === "Backspace") return snap.selectedId && plain ? "delete" : null;
  if (e.key === "Enter") return snap.selectedId && plain ? "edit" : null;
  if (mod && !e.altKey && k === "z") return e.shiftKey ? "redo" : "undo";
  if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && k === "y") return "redo";
  if (e.key === "Escape") return plain && snap.tool === "sticky" ? "tool-off" : null;
  if (plain && k === "n") return "tool-sticky";
  return zoomKeyAction(e);
}

function isEditable(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
}

const WHEEL_ZOOM_RATE = 0.0015;
const LINE_MODE_FACTOR = 20;

/** Trackpad pinch (ctrl + wheel with small pixel deltas): 2.5x the wheel rate. */
export const PINCH_ZOOM_FACTOR = WHEEL_ZOOM_RATE * 2.5;
const PINCH_MAX_STEP_PX = 50;
/** Safety cap on the zoom change of a single pinch event. */
const PINCH_MAX_SCALE = 1.25;

type ZoomWheel = Pick<WheelEvent, "deltaY" | "deltaMode" | "ctrlKey" | "metaKey">;

/**
 * Zoom multiplier for one wheel event. A trackpad pinch (ctrl/meta with pixel deltas under 50) uses PINCH_ZOOM_FACTOR; a mouse wheel, with or without
 * Ctrl, keeps WHEEL_ZOOM_RATE.
 */
export function wheelZoomScale(e: ZoomWheel): number {
  const delta = e.deltaMode === 1 ? e.deltaY * LINE_MODE_FACTOR : e.deltaY;
  const pinch = (e.ctrlKey || e.metaKey) && e.deltaMode === 0 && Math.abs(e.deltaY) < PINCH_MAX_STEP_PX;
  if (!pinch) return Math.exp(-delta * WHEEL_ZOOM_RATE);
  const scale = Math.exp(-delta * PINCH_ZOOM_FACTOR);
  return Math.min(PINCH_MAX_SCALE, Math.max(1 / PINCH_MAX_SCALE, scale));
}

const DRAG_THRESHOLD_PX = 3;
/** One 60 Hz frame; edge-pan speeds are per frame of this length. */
const FRAME_MS = 1000 / 60;
/** A stalled frame pans at most this long a step. */
const MAX_FRAME_MS = 50;

type Drag = { pointerId: number; button: number; x: number; y: number };
type ItemDrag = {
  pointerId: number;
  id: string;
  /** Press position (screen) and the board point under it; the preview is measured from here. */
  x: number;
  y: number;
  startBoard: Point;
  /** Latest pointer position (screen). */
  px: number;
  py: number;
  moved: boolean;
};

type GestureEvent = Event & { scale: number; clientX?: number; clientY?: number };

/**
 * Attaches camera input (wheel, pinch, pan, zoom keys) to the board element.
 * Wheel and pinch listen on `surface` (default `el`): an ancestor covering the board
 * and the overlays on top of it, such as the text editor, so they zoom the board there
 * too rather than the page. Returns a function that removes every listener.
 */
export function attachInput(
  el: HTMLElement,
  store: StormStore,
  getViewport: () => Size,
  surface: HTMLElement = el,
): () => void {
  const classify = createWheelClassifier();
  let spaceDown = false;
  let drag: Drag | null = null;
  let itemDrag: ItemDrag | null = null;
  let gestureStartZoom = 1;
  let panFrame: number | null = null;
  let lastPanTime: number | null = null;

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
    zoomTo(local(e.clientX, e.clientY), camera().zoom * wheelZoomScale(e));
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
  /** Left button: Space pans, the Sticky tool places, the Select tool selects and drags. */
  const primaryDown = (e: PointerEvent) => {
    if (spaceDown) return startPan(e);
    const snap = store.getSnapshot();
    const at = screenToBoard(snap.camera, getViewport(), local(e.clientX, e.clientY));
    if (snap.tool === "sticky") {
      placeSticky(store, at);
      return;
    }
    const hit = hitTest(snap.items, at);
    store.select(hit ? hit.id : null);
    if (!hit) return;
    itemDrag = {
      pointerId: e.pointerId,
      id: hit.id,
      x: e.clientX,
      y: e.clientY,
      startBoard: at,
      px: e.clientX,
      py: e.clientY,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
  };
  const buttonHandlers: Record<number, (e: PointerEvent) => void> = {
    0: primaryDown,
    2: startPan,
  };

  const onPointerDown = (e: PointerEvent) => {
    // A press on the board finishes text editing (the overlay also ends it on blur).
    store.endEdit();
    el.focus({ preventScroll: true });
    if (drag || itemDrag) return;
    buttonHandlers[e.button]?.(e);
  };
  /** Preview offset in board units, measured from the press so camera moves keep the sticky under the pointer. */
  const updatePreview = () => {
    if (!itemDrag) return;
    const now = screenToBoard(camera(), getViewport(), local(itemDrag.px, itemDrag.py));
    store.setDragPreview({
      id: itemDrag.id,
      dx: now.x - itemDrag.startBoard.x,
      dy: now.y - itemDrag.startBoard.y,
    });
  };
  /** Pan speed per axis for the held pointer, or null when it is outside the edge zone. */
  const edgeSpeeds = (): Point | null => {
    if (!itemDrag) return null;
    const r = el.getBoundingClientRect();
    const sx = edgePanSpeed(itemDrag.px, r.left, r.right);
    const sy = edgePanSpeed(itemDrag.py, r.top, r.bottom);
    return sx || sy ? { x: sx, y: sy } : null;
  };
  const stopEdgePan = () => {
    if (panFrame !== null) cancelAnimationFrame(panFrame);
    panFrame = null;
    lastPanTime = null;
  };
  const panTick = (time: number) => {
    panFrame = null;
    const s = edgeSpeeds();
    if (!s) {
      lastPanTime = null;
      return;
    }
    // Speeds are px per 60 Hz frame; scale by the real time since the last frame.
    const dt = lastPanTime === null ? FRAME_MS : Math.min(MAX_FRAME_MS, Math.max(0, time - lastPanTime));
    lastPanTime = time;
    const k = dt / FRAME_MS;
    panScreen(-s.x * k, -s.y * k);
    updatePreview();
    panFrame = requestAnimationFrame(panTick);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (itemDrag && e.pointerId === itemDrag.pointerId) {
      const dx = e.clientX - itemDrag.x;
      const dy = e.clientY - itemDrag.y;
      if (!itemDrag.moved && Math.hypot(dx, dy) <= DRAG_THRESHOLD_PX) return;
      itemDrag.moved = true;
      itemDrag.px = e.clientX;
      itemDrag.py = e.clientY;
      updatePreview();
      if (panFrame === null && edgeSpeeds()) panFrame = requestAnimationFrame(panTick);
      return;
    }
    if (!drag || e.pointerId !== drag.pointerId) return;
    panScreen(e.clientX - drag.x, e.clientY - drag.y);
    drag.x = e.clientX;
    drag.y = e.clientY;
  };
  /** Ends the item drag; commits the move only when `commit` is set (a pointerup). */
  const finishItemDrag = (commit: boolean) => {
    if (!itemDrag) return;
    const done = itemDrag;
    stopEdgePan();
    itemDrag = null;
    if (el.hasPointerCapture(done.pointerId)) el.releasePointerCapture(done.pointerId);
    const preview = store.getSnapshot().dragPreview;
    store.setDragPreview(null);
    if (commit && done.moved && preview) moveSticky(store, done.id, preview.dx, preview.dy, "push");
  };
  const finishPan = () => {
    if (!drag) return;
    if (el.hasPointerCapture(drag.pointerId)) el.releasePointerCapture(drag.pointerId);
    drag = null;
    updateCursor();
  };
  const endDrag = (e: PointerEvent) => {
    if (itemDrag && e.pointerId === itemDrag.pointerId) return finishItemDrag(e.type === "pointerup");
    if (drag && e.pointerId === drag.pointerId) finishPan();
  };
  /** Capture lost without pointerup/pointercancel: end the gesture like a cancel. */
  const onLostCapture = (e: PointerEvent) => {
    if (itemDrag && e.pointerId === itemDrag.pointerId) finishItemDrag(false);
    if (drag && e.pointerId === drag.pointerId) finishPan();
  };
  /** The window lost focus (Alt-Tab): no pointerup will come. */
  const onWindowBlur = () => {
    finishItemDrag(false);
    finishPan();
  };
  /** A new board (Load latest, refresh) ends an item drag; the store already dropped its preview. */
  const onReplace = () => {
    stopEdgePan();
    if (!itemDrag) return;
    if (el.hasPointerCapture(itemDrag.pointerId)) el.releasePointerCapture(itemDrag.pointerId);
    itemDrag = null;
  };
  const onContextMenu = (e: Event) => e.preventDefault();

  // --- keys --------------------------------------------------------------
  const focusInside = () => el.contains(document.activeElement);

  const onKeyDown = (e: KeyboardEvent) => {
    if (!focusInside() || isEditable(e.target)) return;
    const snap = store.getSnapshot();
    const action = routeKey(snap, e);
    if (!action) return;
    e.preventDefault();
    const vp = getViewport();
    switch (action) {
      case "space":
        if (!e.repeat && !spaceDown) {
          spaceDown = true;
          updateCursor();
        }
        return;
      case "nudge": {
        const arrow = ARROWS[e.key];
        const step = e.shiftKey ? 10 : 1;
        return nudge(store, arrow.x * step, arrow.y * step, performance.now());
      }
      case "delete":
        return deleteSelected(store);
      case "edit":
        if (snap.selectedId) store.startEdit(snap.selectedId);
        return;
      case "undo":
        return store.undo();
      case "redo":
        return store.redo();
      case "tool-off":
        return store.setTool("select");
      case "tool-sticky":
        return store.setTool("sticky");
      case "zoom-in":
        return store.setCamera(stepZoom(snap.camera, vp, 1));
      case "zoom-out":
        return store.setCamera(stepZoom(snap.camera, vp, -1));
      case "zoom-reset":
        return zoomTo(centre(), 1);
      case "fit": {
        const items = Object.values(snap.items);
        return store.setCamera(items.length ? fitCamera(boundsOf(items), vp) : { ...HOME_CAMERA });
      }
    }
  };
  /** Double-click on a sticky with the Select tool edits its text. */
  const onDoubleClick = (e: MouseEvent) => {
    const snap = store.getSnapshot();
    if (snap.tool !== "select" || spaceDown) return;
    const at = screenToBoard(snap.camera, getViewport(), local(e.clientX, e.clientY));
    const hit = hitTest(snap.items, at);
    if (hit) store.startEdit(hit.id);
  };
  const endSpace = () => {
    if (!spaceDown) return;
    spaceDown = false;
    updateCursor();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === " ") endSpace();
  };

  surface.addEventListener("wheel", onWheel, { passive: false });
  surface.addEventListener("gesturestart", onGestureStart);
  surface.addEventListener("gesturechange", onGestureChange);
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", endDrag);
  el.addEventListener("pointercancel", endDrag);
  el.addEventListener("lostpointercapture", onLostCapture);
  window.addEventListener("blur", onWindowBlur);
  el.addEventListener("contextmenu", onContextMenu);
  el.addEventListener("keydown", onKeyDown);
  el.addEventListener("dblclick", onDoubleClick);
  el.addEventListener("blur", endSpace, true);
  window.addEventListener("keyup", onKeyUp);
  const offReplace = store.onReplace(onReplace);

  return () => {
    offReplace();
    stopEdgePan();
    surface.removeEventListener("wheel", onWheel);
    surface.removeEventListener("gesturestart", onGestureStart);
    surface.removeEventListener("gesturechange", onGestureChange);
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", endDrag);
    el.removeEventListener("pointercancel", endDrag);
    el.removeEventListener("lostpointercapture", onLostCapture);
    window.removeEventListener("blur", onWindowBlur);
    el.removeEventListener("contextmenu", onContextMenu);
    el.removeEventListener("keydown", onKeyDown);
    el.removeEventListener("dblclick", onDoubleClick);
    el.removeEventListener("blur", endSpace, true);
    window.removeEventListener("keyup", onKeyUp);
    el.style.cursor = "";
    if (itemDrag) store.setDragPreview(null);
  };
}
