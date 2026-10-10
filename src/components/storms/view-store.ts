import { MAX_ZOOM, MIN_ZOOM, type Camera } from "@/lib/storms/camera";

const key = (stormId: string) => `storm-view:${stormId}`;

/** The view last saved for this Storm in this browser, or null if none or unusable. */
export function loadView(stormId: string): Camera | null {
  try {
    const raw = localStorage.getItem(key(stormId));
    if (raw === null) return null;
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return null;
    const { x, y, zoom } = v as Record<string, unknown>;
    if (typeof x !== "number" || typeof y !== "number" || typeof zoom !== "number") return null;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(zoom)) return null;
    if (zoom < MIN_ZOOM || zoom > MAX_ZOOM) return null;
    return { x, y, zoom };
  } catch {
    return null;
  }
}

export function saveView(stormId: string, c: Camera): void {
  try {
    localStorage.setItem(key(stormId), JSON.stringify({ x: c.x, y: c.y, zoom: c.zoom }));
  } catch {
    // Storage may be blocked or full; the view is a convenience only.
  }
}
