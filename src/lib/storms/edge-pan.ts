/** Width of the zone, in screen px, inside each edge of the board where dragging auto-pans. */
export const EDGE_PAN_ZONE = 40;
/** Top speed, in screen px per frame, reached at or beyond the edge. */
export const EDGE_PAN_MAX = 15;

/**
 * Auto-pan speed for one axis while dragging, in screen px per frame.
 * 0 when `pointer` is at least EDGE_PAN_ZONE inside both edges; rises linearly to
 * EDGE_PAN_MAX at the edge and beyond. The sign says which edge: negative near
 * `edgeStart` (left/top), positive near `edgeEnd` (right/bottom). The camera pans
 * by the opposite amount, so the board moves toward the pointer's edge.
 */
export function edgePanSpeed(pointer: number, edgeStart: number, edgeEnd: number): number {
  const ramp = (distanceToEdge: number) =>
    Math.min(1, Math.max(0, (EDGE_PAN_ZONE - distanceToEdge) / EDGE_PAN_ZONE)) * EDGE_PAN_MAX;
  const fromStart = ramp(pointer - edgeStart);
  const fromEnd = ramp(edgeEnd - pointer);
  if (fromEnd > fromStart) return fromEnd;
  return fromStart > 0 ? -fromStart : 0;
}
