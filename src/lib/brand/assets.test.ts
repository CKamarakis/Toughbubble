import { describe, expect, it } from "vitest";
import {
  alphaBoundingBox,
  cropWithMargin,
  dematteFromBlack,
  hexToRgb,
  packIco,
  recolor,
  samplePalette,
  type RgbaImage,
} from "@/lib/brand/assets";

const YELLOW = [247, 208, 0] as const;
const WHITE = [255, 255, 255] as const;

/** A width × height image from a list of RGBA pixels, row by row. */
function image(width: number, height: number, pixels: number[][]): RgbaImage {
  return { data: Uint8Array.from(pixels.flat()), width, height };
}
const CLEAR = [0, 0, 0, 0];
const pixel = (img: RgbaImage, i: number) => Array.from(img.data.subarray(i * 4, i * 4 + 4));

describe("dematteFromBlack", () => {
  it("turns an edge pixel blended with black into the fill color at partial alpha", () => {
    const out = dematteFromBlack(image(1, 1, [[92, 77, 0, 255]]), [WHITE, YELLOW]);
    const [r, g, b, a] = pixel(out, 0);
    expect([r, g, b]).toEqual([...YELLOW]);
    expect(a / 255).toBeCloseTo(0.37, 2);
  });

  it("keeps fills opaque and transparent pixels transparent", () => {
    const out = dematteFromBlack(
      image(3, 1, [[...YELLOW, 255], CLEAR, [3, 3, 0, 0]]),
      [WHITE, YELLOW],
    );
    expect(pixel(out, 0)).toEqual([...YELLOW, 255]);
    expect(pixel(out, 1)).toEqual(CLEAR);
    expect(pixel(out, 2)).toEqual(CLEAR);
  });

  it("reads a grey line edge as white at partial alpha", () => {
    const out = dematteFromBlack(image(1, 1, [[190, 190, 190, 255]]), [WHITE, YELLOW]);
    expect(pixel(out, 0)).toEqual([255, 255, 255, 190]);
  });
});

describe("samplePalette", () => {
  it("returns the fill colors, not rare edge colors or the black matte", () => {
    const fills = Array.from({ length: 50 }, () => [...YELLOW, 255]);
    const lines = Array.from({ length: 30 }, () => [...WHITE, 255]);
    const img = image(82, 1, [...fills, ...lines, [92, 77, 0, 255], [0, 0, 0, 255]]);
    expect(samplePalette(img, 0.05)).toEqual([[...YELLOW], [...WHITE]]);
  });
});

describe("recolor", () => {
  it("repaints only the matching color and keeps its alpha", () => {
    const out = recolor(
      image(2, 1, [[...WHITE, 120], [...YELLOW, 255]]),
      WHITE,
      hexToRgb("#333129"),
    );
    expect(pixel(out, 0)).toEqual([51, 49, 41, 120]);
    expect(pixel(out, 1)).toEqual([...YELLOW, 255]);
  });
});

describe("alphaBoundingBox and cropWithMargin", () => {
  // 4 × 3, visible pixels at (1,1) and (2,1).
  const dot = [...YELLOW, 255];
  const img = image(4, 3, [CLEAR, CLEAR, CLEAR, CLEAR, CLEAR, dot, dot, CLEAR, CLEAR, CLEAR, CLEAR, CLEAR]);

  it("finds the visible pixels", () => {
    expect(alphaBoundingBox(img)).toEqual({ x: 1, y: 1, width: 2, height: 1 });
    expect(alphaBoundingBox(image(1, 1, [CLEAR]))).toBeNull();
  });

  it("crops to the box with an even transparent margin", () => {
    const out = cropWithMargin(img, alphaBoundingBox(img)!, 0.5); // 1px around
    expect([out.width, out.height]).toEqual([4, 3]);
    expect(pixel(out, 5)).toEqual(dot);
    expect(pixel(out, 6)).toEqual(dot);
    expect(pixel(out, 0)).toEqual(CLEAR);
  });
});

describe("packIco", () => {
  it("writes the header and entries and stores each PNG unchanged", () => {
    const small = Uint8Array.from([1, 2, 3]);
    const large = Uint8Array.from([4, 5, 6, 7, 8]);
    const ico = packIco([{ size: 16, png: small }, { size: 256, png: large }]);
    const view = new DataView(ico.buffer);

    expect([view.getUint16(0, true), view.getUint16(2, true), view.getUint16(4, true)]).toEqual([0, 1, 2]);
    expect(ico.length).toBe(6 + 2 * 16 + 3 + 5);

    const entry = (i: number) => {
      const at = 6 + 16 * i;
      return {
        width: ico[at],
        height: ico[at + 1],
        bytes: view.getUint32(at + 8, true),
        offset: view.getUint32(at + 12, true),
      };
    };
    expect(entry(0)).toEqual({ width: 16, height: 16, bytes: 3, offset: 38 });
    expect(entry(1)).toEqual({ width: 0, height: 0, bytes: 5, offset: 41 });
    expect(Array.from(ico.subarray(38, 41))).toEqual([1, 2, 3]);
    expect(Array.from(ico.subarray(41, 46))).toEqual([4, 5, 6, 7, 8]);
  });
});
