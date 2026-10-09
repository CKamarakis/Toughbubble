import type { Node as PMNode } from "@tiptap/pm/model";

// Pure helpers for the image viewer (image-lightbox D1, D3, D4, D5).

export type LightboxImage = { id: string; alt: string | null };

/** The note's images with an attachment id, in the order they appear. */
export function noteImagesIn(doc: PMNode): LightboxImage[] {
  const images: LightboxImage[] = [];
  doc.descendants((node) => {
    if (node.type.name === "image" && node.attrs.attachmentId) {
      images.push({ id: node.attrs.attachmentId as string, alt: (node.attrs.alt as string | null) || null });
    }
  });
  return images;
}

export type Tap = { t: number; x: number; y: number };

export const DOUBLE_TAP_MS = 350;
export const TAP_SLOP_PX = 12;

/** Whether `next` completes a double tap (or double click) after `prev`. */
export function isDoubleTap(prev: Tap | null, next: Tap): boolean {
  if (!prev) return false;
  const dt = next.t - prev.t;
  return dt >= 0 && dt <= DOUBLE_TAP_MS && Math.hypot(next.x - prev.x, next.y - prev.y) <= TAP_SLOP_PX;
}

export const SWIPE_PX = 50;

/** "next" for a swipe left, "prev" for a swipe right, null when the move is short or mostly vertical. */
export function swipeDirection(dx: number, dy: number): "next" | "prev" | null {
  if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) <= Math.abs(dy)) return null;
  return dx < 0 ? "next" : "prev";
}

/** The largest zoom: four times fitted, or the actual size when that is larger. */
export const maxScale = (actual: number) => Math.max(4, actual);

/** A zoom between fitted (1) and `max`. */
export function clampScale(scale: number, max: number): number {
  return Math.min(max, Math.max(1, scale));
}

export type Point = { x: number; y: number };
export type Size = { w: number; h: number };
export type View = { scale: number; offset: Point };

/**
 * The view zoomed to `scale`, keeping the image point under `at` where it is.
 * `at` and the offset are measured from the centre of the viewing area, where
 * the fitted image is centred and scaled from.
 */
export function zoomAround(view: View, scale: number, at: Point): View {
  const k = scale / view.scale;
  return { scale, offset: { x: at.x - (at.x - view.offset.x) * k, y: at.y - (at.y - view.offset.y) * k } };
}

/**
 * The offset kept so the image's edges don't come inside the viewing area:
 * centred on an axis where the zoomed image is smaller than the area.
 */
export function clampOffset(offset: Point, scale: number, fitted: Size, area: Size): Point {
  const axis = (v: number, image: number, room: number) => {
    const limit = Math.max(0, (image * scale - room) / 2);
    return Math.min(limit, Math.max(-limit, v)) || 0;
  };
  return { x: axis(offset.x, fitted.w, area.w), y: axis(offset.y, fitted.h, area.h) };
}
