import { BOARD_LIMIT } from "./limits";
import type { Point, Rect, Size } from "./model";

/** `x, y` is the board point at the viewport's centre. */
export type Camera = { x: number; y: number; zoom: number };

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
export const ZOOM_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4] as const;
export const HOME_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

const EPS = 1e-9;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clampCentre = (v: number) => clamp(v, -BOARD_LIMIT, BOARD_LIMIT);

export function boardToScreen(cam: Camera, vp: Size, p: Point): Point {
  return {
    x: (p.x - cam.x) * cam.zoom + vp.w / 2,
    y: (p.y - cam.y) * cam.zoom + vp.h / 2,
  };
}

export function screenToBoard(cam: Camera, vp: Size, p: Point): Point {
  return {
    x: (p.x - vp.w / 2) / cam.zoom + cam.x,
    y: (p.y - vp.h / 2) / cam.zoom + cam.y,
  };
}

/** Clamps zoom; keeps the board point under `screenPoint` fixed. */
export function zoomAt(cam: Camera, vp: Size, screenPoint: Point, zoom: number): Camera {
  const z = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const b = screenToBoard(cam, vp, screenPoint);
  return {
    x: clampCentre(b.x - (screenPoint.x - vp.w / 2) / z),
    y: clampCentre(b.y - (screenPoint.y - vp.h / 2) / z),
    zoom: z,
  };
}

/** Next step strictly above/below the current zoom, around the viewport centre. */
export function stepZoom(cam: Camera, vp: Size, dir: 1 | -1): Camera {
  const next =
    dir === 1
      ? ZOOM_STEPS.find((s) => s > cam.zoom + EPS)
      : [...ZOOM_STEPS].reverse().find((s) => s < cam.zoom - EPS);
  const target = next ?? (dir === 1 ? MAX_ZOOM : MIN_ZOOM);
  return zoomAt(cam, vp, { x: vp.w / 2, y: vp.h / 2 }, target);
}

/** dx/dy are screen px of content drag; the centre moves the opposite way. */
export function panBy(cam: Camera, dxScreen: number, dyScreen: number): Camera {
  return {
    x: clampCentre(cam.x - dxScreen / cam.zoom),
    y: clampCentre(cam.y - dyScreen / cam.zoom),
    zoom: cam.zoom,
  };
}

export function fitCamera(bounds: Rect | null, vp: Size, marginPx = 64): Camera {
  if (!bounds) return HOME_CAMERA;
  const availW = Math.max(1, vp.w - 2 * marginPx);
  const availH = Math.max(1, vp.h - 2 * marginPx);
  const fit = Math.min(availW / Math.max(bounds.w, EPS), availH / Math.max(bounds.h, EPS));
  return {
    x: clampCentre(bounds.x + bounds.w / 2),
    y: clampCentre(bounds.y + bounds.h / 2),
    zoom: clamp(fit, MIN_ZOOM, MAX_ZOOM),
  };
}

export function visibleRect(cam: Camera, vp: Size): Rect {
  const w = vp.w / cam.zoom;
  const h = vp.h / cam.zoom;
  return { x: cam.x - w / 2, y: cam.y - h / 2, w, h };
}
