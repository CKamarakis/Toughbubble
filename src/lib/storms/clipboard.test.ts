import { describe, expect, it } from "vitest";
import {
  COPIED_STICKY_TYPE,
  parseCopiedSticky,
  placeCopy,
  serializeSticky,
  stickyFromText,
} from "./clipboard";
import { BOARD_LIMIT, MAX_TEXT } from "./limits";
import type { Items, Sticky } from "./model";
import { DEFAULT_STICKY_COLOR } from "./palette";

const PINK = "#FFC6E8";
const sticky: Sticky = {
  id: "11111111-1111-4111-8111-111111111111",
  type: "sticky",
  x: 40,
  y: -60,
  z: "a0",
  w: 240,
  h: 180,
  text: "Plan",
  color: PINK,
  fontSize: 32,
};
const payload = (s: Record<string, unknown>, v: unknown = 1) => JSON.stringify({ v, sticky: s });
const good = { text: "Plan", color: PINK, fontSize: 32, w: 240, h: 180 };

describe("clipboard format", () => {
  it("uses the custom type", () => {
    expect(COPIED_STICKY_TYPE).toBe("application/x-toughbubble-sticky+json");
  });

  it("serialises text, colour, size and dimensions only, and parses back", () => {
    const json = serializeSticky(sticky);
    expect(JSON.parse(json)).toEqual({ v: 1, sticky: good });
    expect(parseCopiedSticky(json)).toEqual(good);
  });

  it("round-trips a sticky without colour or size", () => {
    const plain: Sticky = { ...sticky, color: undefined, fontSize: undefined };
    delete plain.color;
    delete plain.fontSize;
    const parsed = parseCopiedSticky(serializeSticky(plain));
    expect(parsed).toEqual({ text: "Plan", w: 240, h: 180 });
  });

  it.each([
    ["a bad colour", payload({ ...good, color: "#123456" })],
    ["a non-string colour", payload({ ...good, color: 5 })],
    ["size 7", payload({ ...good, fontSize: 7 })],
    ["size 65", payload({ ...good, fontSize: 65 })],
    ["a fractional size", payload({ ...good, fontSize: 20.5 })],
    ["501 characters", payload({ ...good, text: "x".repeat(MAX_TEXT + 1) })],
    ["NaN width", payload({ ...good, w: Number.NaN })],
    ["a zero height", payload({ ...good, h: 0 })],
    ["a width over the board limit", payload({ ...good, w: BOARD_LIMIT + 1 })],
    ["a missing text", payload({ color: PINK, w: 200, h: 200 })],
    ["an unknown version", payload(good, 2)],
    ["a missing version", JSON.stringify({ sticky: good })],
    ["not JSON", "{oops"],
    ["an array", "[]"],
    ["null", "null"],
  ])("rejects %s", (_name, json) => {
    expect(parseCopiedSticky(json)).toBeNull();
  });

  it("accepts 500 characters", () => {
    expect(parseCopiedSticky(payload({ ...good, text: "x".repeat(MAX_TEXT) }))?.text).toHaveLength(MAX_TEXT);
  });

  it("rejects a raw NaN in the payload", () => {
    expect(parseCopiedSticky('{"v":1,"sticky":{"text":"a","w":NaN,"h":200}}')).toBeNull();
  });
});

describe("stickyFromText", () => {
  it("cuts the text to 500 characters and uses the colour, at the default size", () => {
    const c = stickyFromText("y".repeat(800), PINK);
    expect(c).toEqual({ text: "y".repeat(MAX_TEXT), color: PINK, w: 200, h: 200 });
  });

  it("stores the default colour as no colour", () => {
    expect(stickyFromText("Call Anna", DEFAULT_STICKY_COLOR)).toEqual({ text: "Call Anna", w: 200, h: 200 });
  });
});

describe("placeCopy", () => {
  const items: Items = { [sticky.id]: sticky };

  it("centres the copy on the point, with a new id on top", () => {
    const s = placeCopy(good, { x: 500, y: 400 }, items);
    expect(s).toMatchObject({ type: "sticky", x: 380, y: 310, w: 240, h: 180, text: "Plan", color: PINK, fontSize: 32 });
    expect(s.id).not.toBe(sticky.id);
    expect(s.z > sticky.z).toBe(true);
  });

  it("leaves out colour and size when the copy has none", () => {
    const s = placeCopy({ text: "", w: 200, h: 200 }, { x: 0, y: 0 }, {});
    expect("color" in s).toBe(false);
    expect("fontSize" in s).toBe(false);
  });

  it("clamps the copy within the board limit", () => {
    const far = placeCopy(good, { x: 5_000_000, y: -5_000_000 }, items);
    expect(far.x).toBe(BOARD_LIMIT - good.w);
    expect(far.y).toBe(-BOARD_LIMIT);
  });
});
