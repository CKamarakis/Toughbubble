import { describe, expect, it } from "vitest";
import type { Sticky } from "@/lib/storms/model";
import { overlayBox } from "./sticky-text-overlay";

const s: Sticky = { id: "a", type: "sticky", x: 100, y: 50, z: "a0", w: 200, h: 200, text: "" };
const vp = { w: 800, h: 600 };

describe("overlayBox", () => {
  it("covers the sticky on screen and scales type and padding by zoom", () => {
    const box = overlayBox(s, { x: 0, y: 0, zoom: 2 }, vp, { lineHeight: 26, top: 87, lines: 1 });
    expect(box).toEqual({
      left: 600,
      top: 400,
      width: 400,
      height: 400,
      fontSize: 40,
      lineHeight: 52,
      paddingTop: 174,
      paddingX: 32,
      // Clips to the lines the canvas draws: top + 1 line, in screen px.
      clipBottom: 400 - (87 + 26) * 2,
    });
  });

  it("at 50% halves everything", () => {
    const cam = { x: 200, y: 150, zoom: 0.5 };
    const box = overlayBox(s, cam, vp, { lineHeight: 26, top: 22, lines: 6 });
    expect(box).toMatchObject({
      left: 350,
      top: 250,
      width: 100,
      fontSize: 10,
      paddingTop: 11,
      paddingX: 8,
    });
    expect(box.clipBottom).toBeCloseTo(100 - (22 + 156) * 0.5);
  });
});
