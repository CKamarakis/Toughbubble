import type { Item, Items } from "./model";

export type ChangeSet = { upsert: Item[]; delete: string[] };

export const NO_CHANGES: ChangeSet = { upsert: [], delete: [] };

const encoder = new TextEncoder();
const byteLength = (value: unknown): number => encoder.encode(JSON.stringify(value)).length;

/** New board with the changes applied: deletes first, then upserts. */
export function applyChanges(items: Items, cs: ChangeSet): Items {
  const next: Items = { ...items };
  for (const id of cs.delete) delete next[id];
  for (const item of cs.upsert) next[item.id] = item;
  return next;
}

/** The change set that undoes `cs` when applied to the board `cs` produced from `before`. */
export function invertChanges(before: Items, cs: ChangeSet): ChangeSet {
  const upsert: Item[] = [];
  const del: string[] = [];
  for (const item of cs.upsert) {
    const old = before[item.id];
    if (old) upsert.push(old);
    else del.push(item.id);
  }
  for (const id of cs.delete) {
    const old = before[id];
    if (old) upsert.push(old);
  }
  return { upsert, delete: del };
}

/** Latest entry per id wins; an id never appears in both lists. */
export function mergeChanges(older: ChangeSet, newer: ChangeSet): ChangeSet {
  const upserts = new Map<string, Item>();
  const deletes = new Set<string>();
  for (const cs of [older, newer]) {
    for (const id of cs.delete) {
      upserts.delete(id);
      deletes.add(id);
    }
    for (const item of cs.upsert) {
      deletes.delete(item.id);
      upserts.set(item.id, item);
    }
  }
  return { upsert: [...upserts.values()], delete: [...deletes] };
}

export function isEmptyChanges(cs: ChangeSet): boolean {
  return cs.upsert.length === 0 && cs.delete.length === 0;
}

export function changesBytes(cs: ChangeSet): number {
  return byteLength(cs);
}

/**
 * Splits into consecutive chunks of at most `maxBytes` each. All deletes go in the
 * first chunk; if they alone exceed `maxBytes` they are still emitted there (never
 * split). A single upsert larger than `maxBytes` likewise gets a chunk of its own.
 */
export function splitChanges(cs: ChangeSet, maxBytes: number): ChangeSet[] {
  if (isEmptyChanges(cs)) return [];
  const chunks: ChangeSet[] = [];
  let deletes = cs.delete;
  let upsert: Item[] = [];
  let bytes = changesBytes({ upsert: [], delete: deletes });
  for (const item of cs.upsert) {
    // Adding an item costs its own JSON plus a comma when it is not the first.
    const cost = byteLength(item) + (upsert.length > 0 ? 1 : 0);
    if ((upsert.length > 0 || deletes.length > 0) && bytes + cost > maxBytes) {
      chunks.push({ upsert, delete: deletes });
      deletes = [];
      upsert = [];
      bytes = changesBytes(NO_CHANGES);
    }
    bytes += upsert.length > 0 ? cost : byteLength(item);
    upsert.push(item);
  }
  chunks.push({ upsert, delete: deletes });
  return chunks;
}
