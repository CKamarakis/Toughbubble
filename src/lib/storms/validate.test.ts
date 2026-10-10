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
    bad(cs([JSON.parse(`{"__proto__":{},"id":"${A}"}`)]));
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
    bad(cs([sticky(A, { text: "a".repeat(5_001) })]));
    bad(cs([sticky(A, { text: 1 })]));
  });
  it("rejects a bad parentId", () => bad(cs([sticky(A, { parentId: "nope" })])));
  it("rejects too many deletes", () => {
    bad(cs([], Array.from({ length: 5_001 }, (_, i) => uuid(i))));
  });
  it("rejects a set over the byte cap", () => {
    const upsert = Array.from({ length: 200 }, (_, i) => sticky(uuid(i), { text: "a".repeat(5_000) }));
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
