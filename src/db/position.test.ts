import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import { describe, expect, it } from "vitest";

// Byte-order comparison, matching the "C" collation on items.position.
const byteOrder = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

describe("fractional-indexing position keys", () => {
  it("generates a key between two neighbours without touching them", () => {
    const [a, b] = generateNKeysBetween(null, null, 2);
    const mid = generateKeyBetween(a, b);
    expect([b, mid, a].sort(byteOrder)).toEqual([a, mid, b]);
  });

  it("keeps order after many inserts into the same gap", () => {
    const keys = generateNKeysBetween(null, null, 2);
    for (let i = 0; i < 50; i++) keys.splice(1, 0, generateKeyBetween(keys[0], keys[1]));
    // Each new key went right after keys[0], so the array is now in reverse insertion order.
    expect([...keys].sort(byteOrder)).toEqual(keys);
  });
});
