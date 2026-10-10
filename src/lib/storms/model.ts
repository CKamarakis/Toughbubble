import { generateKeyBetween } from "fractional-indexing";

export type Point = { x: number; y: number };
export type Size = { w: number; h: number };
export type Rect = Point & Size;

/** x, y are the top-left corner in board px. */
export type Sticky = {
  id: string;
  type: "sticky";
  x: number;
  y: number;
  z: string;
  w: number;
  h: number;
  text: string;
  parentId?: string;
  rotation?: number;
};

export type Item = Sticky;
export type Items = Record<string, Item>;

export type StormBody = { schema: 1; items: Items };

export const EMPTY_BOARD: StormBody = { schema: 1, items: {} };

export const STICKY = { size: 200, fill: "#F7D000", text: "#333129", fontPx: 20, padding: 16 };

/** A z key above every item's. */
export function topZ(items: Items): string {
  let maxZ: string | null = null;
  for (const item of Object.values(items)) if (maxZ === null || item.z > maxZ) maxZ = item.z;
  return generateKeyBetween(maxZ, null);
}

export function boundsOf(items: Item[]): Rect | null {
  if (items.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { x, y, w, h } of items) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// Keys are ASCII, so comparing code units gives byte order.
export const byZ = (a: Item, b: Item): number => (a.z < b.z ? -1 : a.z > b.z ? 1 : 0);
