import { describe, expect, it } from "vitest";
import {
  NO_CHANGES,
  applyChanges,
  changesBytes,
  invertChanges,
  isEmptyChanges,
  mergeChanges,
  splitChanges,
  type ChangeSet,
} from "./changeset";
import type { Item, Items } from "./model";

const sticky = (id: string, over: Partial<Item> = {}): Item => ({
  id,
  type: "sticky",
  x: 0,
  y: 0,
  z: "a0",
  w: 200,
  h: 200,
  text: "",
  ...over,
});
const board = (...items: Item[]): Items => Object.fromEntries(items.map((i) => [i.id, i]));

describe("applyChanges", () => {
  it("returns a new object and leaves the input untouched", () => {
    const before = board(sticky("a"));
    const after = applyChanges(before, { upsert: [sticky("b")], delete: ["a"] });
    expect(Object.keys(after)).toEqual(["b"]);
    expect(Object.keys(before)).toEqual(["a"]);
  });
});

describe("invertChanges", () => {
  const roundTrip = (before: Items, cs: ChangeSet) =>
    expect(applyChanges(applyChanges(before, cs), invertChanges(before, cs))).toEqual(before);

  it("apply then apply(invert) restores the board: place", () => {
    roundTrip(board(sticky("a")), { upsert: [sticky("b")], delete: [] });
  });
  it("apply then apply(invert) restores the board: move", () => {
    roundTrip(board(sticky("a")), { upsert: [sticky("a", { x: 50, y: 60 })], delete: [] });
  });
  it("apply then apply(invert) restores the board: delete", () => {
    roundTrip(board(sticky("a"), sticky("b")), { upsert: [], delete: ["a"] });
  });
  it("ignores deletes of ids that did not exist", () => {
    const before = board(sticky("a"));
    const cs: ChangeSet = { upsert: [], delete: ["ghost"] };
    expect(invertChanges(before, cs)).toEqual(NO_CHANGES);
    roundTrip(before, cs);
  });
});

describe("mergeChanges", () => {
  it("upsert then delete = delete", () => {
    const m = mergeChanges({ upsert: [sticky("a")], delete: [] }, { upsert: [], delete: ["a"] });
    expect(m).toEqual({ upsert: [], delete: ["a"] });
  });
  it("delete then upsert = upsert", () => {
    const m = mergeChanges({ upsert: [], delete: ["a"] }, { upsert: [sticky("a")], delete: [] });
    expect(m).toEqual({ upsert: [sticky("a")], delete: [] });
  });
  it("two upserts keep the newer", () => {
    const m = mergeChanges(
      { upsert: [sticky("a", { x: 1 })], delete: [] },
      { upsert: [sticky("a", { x: 2 })], delete: [] },
    );
    expect(m.upsert).toEqual([sticky("a", { x: 2 })]);
  });
  it("never lists an id in both", () => {
    const m = mergeChanges(
      { upsert: [sticky("a"), sticky("b")], delete: ["c"] },
      { upsert: [sticky("c")], delete: ["a", "d"] },
    );
    const up = m.upsert.map((i) => i.id);
    expect(up.filter((id) => m.delete.includes(id))).toEqual([]);
    expect([...up].sort()).toEqual(["b", "c"]);
    expect([...m.delete].sort()).toEqual(["a", "d"]);
  });
});

describe("isEmptyChanges", () => {
  it("is true only for no entries", () => {
    expect(isEmptyChanges(NO_CHANGES)).toBe(true);
    expect(isEmptyChanges({ upsert: [], delete: ["a"] })).toBe(false);
  });
});

describe("splitChanges", () => {
  it("returns [] for an empty change set", () => {
    expect(splitChanges(NO_CHANGES, 100)).toEqual([]);
  });
  it("each chunk <= maxBytes and applying all chunks equals applying the whole", () => {
    const start = board(sticky("x"), sticky("y"));
    const cs: ChangeSet = {
      upsert: Array.from({ length: 30 }, (_, i) => sticky(`s${i}`, { text: "t".repeat(i * 3) })),
      delete: ["x", "y"],
    };
    const max = 600;
    const chunks = splitChanges(cs, max);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(changesBytes(c)).toBeLessThanOrEqual(max);
    expect(chunks[0].delete).toEqual(["x", "y"]);
    expect(chunks.slice(1).every((c) => c.delete.length === 0)).toBe(true);
    const all = chunks.reduce((acc, c) => applyChanges(acc, c), start);
    expect(all).toEqual(applyChanges(start, cs));
  });
  it("emits oversized deletes in the first chunk anyway", () => {
    const ids = Array.from({ length: 50 }, (_, i) => `id-${i}`);
    const chunks = splitChanges({ upsert: [sticky("a")], delete: ids }, 50);
    expect(chunks[0].delete).toEqual(ids);
    expect(chunks.flatMap((c) => c.upsert)).toEqual([sticky("a")]);
  });
});
