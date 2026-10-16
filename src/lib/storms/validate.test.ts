import { describe, expect, it } from "vitest";
import { isStormBody, validateChangeSet } from "./validate";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

const sticky = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  type: "sticky",
  x: 0,
  y: 0,
  z: "a0",
  w: 200,
  h: 200,
  text: "hi",
  ...over,
});
const cs = (upsert: unknown, del: unknown = []) => ({ upsert, delete: del });
const bad = (input: unknown) =>
  expect(validateChangeSet(input)).toEqual({ ok: false, error: "That change was not valid." });
const uuid = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;

describe("validateChangeSet", () => {
  it("accepts a valid set and returns equal, fresh objects", () => {
    const input = cs([sticky(A, { parentId: B, rotation: 0.5 })], [B]);
    const r = validateChangeSet(input);
    expect(r).toEqual({ ok: true, changes: input });
    if (r.ok) expect(r.changes.upsert[0]).not.toBe((input.upsert as unknown[])[0]);
  });
  it("rejects non-objects, arrays, and extra or missing keys", () => {
    bad(null);
    bad([]);
    bad("x");
    bad({ upsert: [] });
    bad({ ...cs([]), extra: 1 });
    bad(cs({}));
  });
  it("rejects a non-UUID id", () => bad(cs([sticky("nope")])));
  it("rejects a non-UUID delete id", () => bad(cs([], ["nope"])));
  it("rejects a duplicate id in upsert", () => bad(cs([sticky(A), sticky(A)])));
  it("rejects a duplicate id in delete", () => bad(cs([], [A, A])));
  it("rejects an id in both lists", () => bad(cs([sticky(A)], [A])));
  it("rejects an unknown field", () => bad(cs([sticky(A, { color: "red" })])));
  it("rejects __proto__ and constructor keys", () => {
    bad(cs([JSON.parse(JSON.stringify(sticky(A)).replace("{", '{"__proto__":{"x":1},'))]));
    bad(cs([sticky(A, { constructor: 1 })]));
  });
  it("rejects a non-plain item", () => {
    bad(cs([[]]));
    bad(cs([new Date()]));
  });
  it("rejects a wrong type", () => bad(cs([sticky(A, { type: "shape" })])));
  it("rejects NaN and Infinity", () => {
    bad(cs([sticky(A, { x: NaN })]));
    bad(cs([sticky(A, { y: Infinity })]));
    bad(cs([sticky(A, { rotation: NaN })]));
  });
  it("rejects out-of-range positions", () => {
    bad(cs([sticky(A, { x: 1_000_001 })]));
    bad(cs([sticky(A, { y: -1_000_001 })]));
  });
  it("rejects bad sizes", () => {
    bad(cs([sticky(A, { w: 0 })]));
    bad(cs([sticky(A, { h: -1 })]));
    bad(cs([sticky(A, { w: 1_000_001 })]));
  });
  it("rejects bad z", () => {
    bad(cs([sticky(A, { z: "" })]));
    bad(cs([sticky(A, { z: "a".repeat(65) })]));
    bad(cs([sticky(A, { z: 1 })]));
  });
  it("rejects bad text", () => {
    bad(cs([sticky(A, { text: "a".repeat(501) })]));
    bad(cs([sticky(A, { text: 1 })]));
  });
  it("rejects a bad parentId", () => bad(cs([sticky(A, { parentId: "nope" })])));
  it("rejects too many deletes", () => {
    bad(cs([], Array.from({ length: 5_001 }, (_, i) => uuid(i))));
  });
  it("rejects too many upserts", () => {
    bad(cs(Array.from({ length: 5_001 }, (_, i) => sticky(uuid(i)))));
  });
  it("accepts values exactly at the limits", () => {
    const items = [
      sticky(uuid(1), { x: 1_000_000, y: -1_000_000, w: 1_000_000, h: 1_000_000 }),
      sticky(uuid(2), { x: -1_000_000, z: "z".repeat(64), text: "t".repeat(500) }),
    ];
    expect(validateChangeSet(cs(items))).toEqual({ ok: true, changes: cs(items) });
  });
  it("rejects a set over the byte cap", () => {
    const upsert = Array.from({ length: 2_000 }, (_, i) => sticky(uuid(i), { text: "a".repeat(500) }));
    bad(cs(upsert));
  });
});

describe("isStormBody", () => {
  it("accepts schema 1 with items object", () => expect(isStormBody({ schema: 1, items: {} })).toBe(true));
  it("rejects schema 2", () => expect(isStormBody({ schema: 2, items: {} })).toBe(false));
  it("rejects bad items and non-objects", () => {
    expect(isStormBody({ schema: 1, items: null })).toBe(false);
    expect(isStormBody({ schema: 1, items: [] })).toBe(false);
    expect(isStormBody(null)).toBe(false);
  });
});

describe("validateChangeSet sticky style", () => {
  const ok = (over: Record<string, unknown>) => expect(validateChangeSet(cs([sticky(A, over)])).ok).toBe(true);
  const no = (over: Record<string, unknown>) => bad(cs([sticky(A, over)]));
  it("accepts a preset colour and a whole size in range", () => {
    ok({ color: "#3263C3", fontSize: 8 });
    ok({ color: "#F7D000", fontSize: 64 });
    ok({ fontSize: 12 });
  });
  it("keeps colour and size on the returned item", () => {
    const r = validateChangeSet(cs([sticky(A, { color: "#FFD5EE", fontSize: 20 })]));
    expect(r.ok && r.changes.upsert[0]).toMatchObject({ color: "#FFD5EE", fontSize: 20 });
  });
  it("accepts a sticky without style", () => ok({}));
  it("rejects a colour that is not a preset", () => {
    no({ color: "#123456" });
    no({ color: "#f7d000" });
    no({ color: "yellow" });
    no({ color: 5 });
    no({ color: null });
  });
  it("rejects sizes out of range or not whole", () => {
    no({ fontSize: 7 });
    no({ fontSize: 65 });
    no({ fontSize: 12.5 });
    no({ fontSize: "12" });
    no({ fontSize: NaN });
  });
});
