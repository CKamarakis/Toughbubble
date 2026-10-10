import { byZ, type Item, type Items, type Point } from "./model";

/** The topmost item whose rect contains `p` (edges inclusive), or null. */
export function hitTest(items: Items, p: Point): Item | null {
  let top: Item | null = null;
  for (const item of Object.values(items)) {
    if (p.x < item.x || p.x > item.x + item.w || p.y < item.y || p.y > item.y + item.h) continue;
    if (top === null || byZ(item, top) > 0) top = item;
  }
  return top;
}
