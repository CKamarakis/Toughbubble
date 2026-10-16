import { placeCopy, type CopiedSticky } from "@/lib/storms/clipboard";
import { BOARD_LIMIT } from "@/lib/storms/limits";
import { DEFAULT_STICKY_COLOR } from "@/lib/storms/palette";
import { STICKY, topZ, type Point, type Sticky } from "@/lib/storms/model";
import type { CommitMode, StormStore } from "./store";

const NUDGE_MERGE_MS = 1_000;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Places a sticky in the creation colour, centred on `at` (clamped inside the board),
 * selects it and returns its id. Yellow is stored as no colour, like older stickies.
 */
export function placeSticky(store: StormStore, at: Point): string {
  const size = STICKY.size;
  const { creationColor } = store.getSnapshot();
  const sticky: Sticky = {
    id: crypto.randomUUID(),
    type: "sticky",
    x: clamp(at.x - size / 2, -BOARD_LIMIT, BOARD_LIMIT - size),
    y: clamp(at.y - size / 2, -BOARD_LIMIT, BOARD_LIMIT - size),
    z: topZ(store.getSnapshot().items),
    w: size,
    h: size,
    text: "",
    ...(creationColor !== DEFAULT_STICKY_COLOR && { color: creationColor }),
  };
  return addSelected(store, sticky);
}

/** Gap between a sticky and its duplicate, in board px (D2). */
const DUPLICATE_GAP = 20;

/** Adds `sticky` as one undo step, selects it and returns to the Select tool. */
function addSelected(store: StormStore, sticky: Sticky): string {
  store.commit({ upsert: [sticky], delete: [] }, "push");
  store.select(sticky.id);
  store.setTool("select");
  return sticky.id;
}

/** Pastes `copied` as a new sticky centred on `at` (clamped), on top and selected; one undo step. */
export function pasteSticky(store: StormStore, copied: CopiedSticky, at: Point): string {
  return addSelected(store, placeCopy(copied, at, store.getSnapshot().items));
}

/**
 * Duplicates the selected sticky 20 px to its right at the same y (clamped), on top and
 * selected; one undo step. Returns the new id, or null with nothing selected.
 */
export function duplicateSelected(store: StormStore): string | null {
  const { selectedId, items } = store.getSnapshot();
  const item = selectedId ? items[selectedId] : undefined;
  if (!item) return null;
  const { text, color, fontSize, w, h } = item;
  const copied: CopiedSticky = {
    text,
    ...(color !== undefined && { color }),
    ...(fontSize !== undefined && { fontSize }),
    w,
    h,
  };
  const centre = { x: item.x + w + DUPLICATE_GAP + w / 2, y: item.y + h / 2 };
  return addSelected(store, placeCopy(copied, centre, items));
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

/** Deletes the selected sticky as one undo step. */
export function deleteSelected(store: StormStore) {
  const id = store.getSnapshot().selectedId;
  if (!id) return;
  store.commit({ upsert: [], delete: [id] }, "push");
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
