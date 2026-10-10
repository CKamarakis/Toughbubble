import { BOARD_LIMIT } from "@/lib/storms/limits";
import { STICKY, topZ, type Point, type Sticky } from "@/lib/storms/model";
import type { CommitMode, StormStore } from "./store";

const NUDGE_MERGE_MS = 1_000;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Places a sticky centred on `at` (clamped inside the board), selects it and returns its id. */
export function placeSticky(store: StormStore, at: Point): string {
  const size = STICKY.size;
  const sticky: Sticky = {
    id: crypto.randomUUID(),
    type: "sticky",
    x: clamp(at.x - size / 2, -BOARD_LIMIT, BOARD_LIMIT - size),
    y: clamp(at.y - size / 2, -BOARD_LIMIT, BOARD_LIMIT - size),
    z: topZ(store.getSnapshot().items),
    w: size,
    h: size,
    text: "",
  };
  store.commit({ upsert: [sticky], delete: [] }, "push");
  store.select(sticky.id);
  store.setTool("select");
  return sticky.id;
}

/** Moves a sticky by (dx, dy) board px, keeping it inside the board. */
export function moveSticky(
  store: StormStore,
  id: string,
  dx: number,
  dy: number,
  mode: Exclude<CommitMode, "none">,
) {
  const item = store.getSnapshot().items[id];
  if (!item) return;
  const x = clamp(item.x + dx, -BOARD_LIMIT, BOARD_LIMIT - item.w);
  const y = clamp(item.y + dy, -BOARD_LIMIT, BOARD_LIMIT - item.h);
  if (x === item.x && y === item.y) return;
  store.commit({ upsert: [{ ...item, x, y }], delete: [] }, mode);
}

type LastNudge = { id: string; at: number; top: unknown };
const lastNudge = new WeakMap<StormStore, LastNudge>();

/**
 * Nudges the selected sticky. Merges into the previous nudge step when it was on the
 * same sticky within 1,000 ms and nothing else touched the history since (any other
 * commit, undo or redo changes the top step, which is how that is detected).
 */
export function nudge(store: StormStore, dx: number, dy: number, now: number) {
  const id = store.getSnapshot().selectedId;
  if (!id) return;
  const last = lastNudge.get(store);
  const undo = store.getHistory().undo;
  const merge =
    !!last &&
    last.id === id &&
    now - last.at <= NUDGE_MERGE_MS &&
    undo.length > 0 &&
    undo[undo.length - 1] === last.top;
  const before = store.getHistory().undo;
  moveSticky(store, id, dx, dy, merge ? "merge-top" : "push");
  const after = store.getHistory().undo;
  if (after !== before) {
    lastNudge.set(store, { id, at: now, top: after[after.length - 1] });
  }
}
