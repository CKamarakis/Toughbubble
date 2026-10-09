import { getSchema } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { noteExtensions } from "./extensions";
import { clampOffset, clampScale, isDoubleTap, maxScale, noteImagesIn, swipeDirection, zoomAround } from "./lightbox";

const schema = getSchema(noteExtensions());
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

describe("noteImagesIn", () => {
  it("lists images with an id in note order, skipping file cards and images still being copied", () => {
    const doc = schema.nodeFromJSON({
      type: "doc",
      content: [
        { type: "image", attrs: { attachmentId: B, alt: "Second" } },
        { type: "paragraph", content: [{ type: "text", text: "between" }] },
        { type: "fileAttachment", attrs: { attachmentId: C, name: "a.pdf", mimeType: "application/pdf", size: 1 } },
        { type: "image", attrs: { attachmentId: null, copyOf: C } },
        { type: "image", attrs: { attachmentId: A, alt: "" } },
      ],
    });
    expect(noteImagesIn(doc)).toEqual([
      { id: B, alt: "Second" },
      { id: A, alt: null },
    ]);
  });
});

describe("isDoubleTap", () => {
  const first = { t: 1000, x: 100, y: 100 };
  it("needs a first tap", () => expect(isDoubleTap(null, first)).toBe(false));
  it("accepts a quick second tap nearby", () => expect(isDoubleTap(first, { t: 1300, x: 108, y: 105 })).toBe(true));
  it("rejects a slow second tap", () => expect(isDoubleTap(first, { t: 1400, x: 100, y: 100 })).toBe(false));
  it("rejects a second tap too far away", () => expect(isDoubleTap(first, { t: 1100, x: 120, y: 100 })).toBe(false));
});

describe("swipeDirection", () => {
  it("swipe left is next, right is previous", () => {
    expect(swipeDirection(-60, 10)).toBe("next");
    expect(swipeDirection(60, -10)).toBe("prev");
  });
  it("ignores short moves", () => expect(swipeDirection(-40, 0)).toBeNull());
  it("ignores mostly vertical moves", () => expect(swipeDirection(-60, 80)).toBeNull());
});

describe("zoom", () => {
  it("keeps the scale between fitted and the maximum", () => {
    expect(clampScale(0.5, 4)).toBe(1);
    expect(clampScale(6, 4)).toBe(4);
    expect(clampScale(2, 4)).toBe(2);
    expect(maxScale(2)).toBe(4);
    expect(maxScale(5)).toBe(5);
  });

  it("keeps the pointed-at point where it is", () => {
    const view = { scale: 1, offset: { x: 0, y: 0 } };
    const at = { x: 100, y: -50 };
    const next = zoomAround(view, 2, at);
    // The image point under `at` was at local (100, -50); after zooming it is at offset + local * scale.
    expect(next.offset.x + 100 * 2).toBe(at.x);
    expect(next.offset.y + -50 * 2).toBe(at.y);
    expect(next.scale).toBe(2);
    // And back again from a zoomed, moved view.
    const back = zoomAround(next, 1, at);
    expect(back.offset).toEqual({ x: 0, y: 0 });
  });

  it("clamps the offset so the edges stay outside the area", () => {
    const fitted = { w: 1000, h: 500 };
    const area = { w: 1000, h: 800 };
    // At 2x the image is 2000 × 1000: 500 px spare on each side across, 100 down.
    expect(clampOffset({ x: 900, y: -300 }, 2, fitted, area)).toEqual({ x: 500, y: -100 });
    expect(clampOffset({ x: -900, y: 300 }, 2, fitted, area)).toEqual({ x: -500, y: 100 });
    expect(clampOffset({ x: 200, y: 50 }, 2, fitted, area)).toEqual({ x: 200, y: 50 });
    // Smaller than the area on an axis: centred there.
    expect(clampOffset({ x: 30, y: 30 }, 1.2, fitted, area)).toEqual({ x: 30, y: 0 });
    expect(clampOffset({ x: 30, y: 30 }, 1, fitted, area)).toEqual({ x: 0, y: 0 });
  });
});
