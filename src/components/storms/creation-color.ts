import { DEFAULT_STICKY_COLOR, PRESET_HEXES } from "@/lib/storms/palette";
import type { StormStore } from "./engine/store";

/**
 * The colour for new stickies, remembered per user in this browser (design D8), keyed like
 * the undo store. Storage is a convenience: blocked, missing or corrupt reads as Yellow.
 */
const key = (userId: string) => `storm-sticky-color:${userId}`;

/** The remembered colour for new stickies; Yellow when none, unreadable or not a preset. */
export function loadCreationColor(userId: string): string {
  try {
    const v = localStorage.getItem(key(userId));
    return v !== null && PRESET_HEXES.has(v) ? v : DEFAULT_STICKY_COLOR;
  } catch {
    return DEFAULT_STICKY_COLOR;
  }
}

export function saveCreationColor(userId: string, hex: string): void {
  if (!PRESET_HEXES.has(hex)) return;
  try {
    localStorage.setItem(key(userId), hex);
  } catch {
    // Storage may be blocked or full; new stickies just start Yellow next time.
  }
}

/** Writes the store's creation colour whenever it changes; returns the unsubscribe. */
export function bindCreationColor(store: StormStore, userId: string): () => void {
  let last = store.getSnapshot().creationColor;
  return store.subscribe(() => {
    const { creationColor } = store.getSnapshot();
    if (creationColor === last) return;
    last = creationColor;
    saveCreationColor(userId, creationColor);
  });
}
