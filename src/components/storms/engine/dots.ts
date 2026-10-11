/** Fewest screen px between drawn grid dots; closer ones are thinned out. */
export const DOT_MIN_SCREEN_PX = 12;

/**
 * Every how-many-th grid dot to draw: doubles until the dots are at least `minPx`
 * apart on screen. Keeps the per-frame dot count low just above the no-dots zoom.
 */
export function dotStride(zoom: number, spacing: number, minPx: number = DOT_MIN_SCREEN_PX): number {
  let stride = 1;
  while (spacing * zoom * stride < minPx) stride *= 2;
  return stride;
}
