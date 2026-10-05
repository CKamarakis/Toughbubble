// Pixel helpers for generating the brand images from the 1024px masters in
// src/toughbubble_assets/. They work on raw RGBA buffers so they can be tested
// without image files; scripts/generate-brand-assets.ts does the decoding.

/** A raw image: 4 bytes per pixel (RGBA), row by row. */
export type RgbaImage = { data: Uint8Array; width: number; height: number };
export type Rgb = readonly [number, number, number];
export type Box = { x: number; y: number; width: number; height: number };

/** The smallest box holding every pixel with alpha above `threshold`. Null if none. */
export function alphaBoundingBox(img: RgbaImage, threshold = 0): Box | null {
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/**
 * Crops `box` out of `img` and surrounds it with a transparent margin of
 * `margin` × the box's longer side on every edge.
 */
export function cropWithMargin(img: RgbaImage, box: Box, margin: number): RgbaImage {
  const pad = Math.round(Math.max(box.width, box.height) * margin);
  const width = box.width + 2 * pad;
  const height = box.height + 2 * pad;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < box.height; y++) {
    const from = ((box.y + y) * img.width + box.x) * 4;
    data.set(img.data.subarray(from, from + box.width * 4), ((y + pad) * width + pad) * 4);
  }
  return { data, width, height };
}

/**
 * The logo's solid colors: opaque colors covering at least `minShare` of the
 * opaque pixels. Edge pixels are each rare, so only the fills qualify.
 */
export function samplePalette(img: RgbaImage, minShare = 0.01): Rgb[] {
  const counts = new Map<number, number>();
  let opaque = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] !== 255) continue;
    const key = (img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2];
    if (key === 0) continue; // black is the matte, not a logo color
    counts.set(key, (counts.get(key) ?? 0) + 1);
    opaque++;
  }
  return [...counts]
    .filter(([, n]) => n >= opaque * minShare)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => [key >> 16, (key >> 8) & 255, key & 255] as const);
}

/**
 * Undoes edge smoothing that was blended against black. Each pixel is read as
 * k × C for the palette color C it fits best; it becomes C at alpha k, so
 * edges fade to transparent instead of to a dark rim.
 */
export function dematteFromBlack(img: RgbaImage, palette: Rgb[]): RgbaImage {
  const data = new Uint8Array(img.data.length);
  for (let i = 0; i < img.data.length; i += 4) {
    const alpha = img.data[i + 3];
    const [r, g, b] = [img.data[i], img.data[i + 1], img.data[i + 2]];
    if (alpha === 0 || r + g + b === 0) continue;
    let best: Rgb | null = null, bestK = 0, bestError = Infinity;
    for (const c of palette) {
      const k = Math.min(1, (r * c[0] + g * c[1] + b * c[2]) / (c[0] ** 2 + c[1] ** 2 + c[2] ** 2));
      const error = (r - k * c[0]) ** 2 + (g - k * c[1]) ** 2 + (b - k * c[2]) ** 2;
      if (error < bestError) [best, bestK, bestError] = [c, k, error];
    }
    if (!best) continue;
    data.set([best[0], best[1], best[2], Math.round(alpha * bestK)], i);
  }
  return { data, width: img.width, height: img.height };
}

/** Repaints every pixel of color `from` as `to`, keeping its alpha. */
export function recolor(img: RgbaImage, from: Rgb, to: Rgb): RgbaImage {
  const data = img.data.slice();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0 && data[i] === from[0] && data[i + 1] === from[1] && data[i + 2] === from[2]) {
      data.set(to, i);
    }
  }
  return { data, width: img.width, height: img.height };
}

/** "#333129" -> [51, 49, 41]. */
export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.replace("#", ""), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/**
 * An .ico file holding the given PNGs as-is (PNG-in-ICO, read by every
 * current browser). Sizes are square, up to 256px.
 */
export function packIco(images: { size: number; png: Uint8Array }[]): Uint8Array {
  const headerSize = 6 + 16 * images.length;
  const total = headerSize + images.reduce((sum, image) => sum + image.png.length, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, images.length, true);
  let offset = headerSize;
  images.forEach(({ size, png }, i) => {
    const entry = 6 + 16 * i;
    view.setUint8(entry, size >= 256 ? 0 : size); // 0 means 256
    view.setUint8(entry + 1, size >= 256 ? 0 : size);
    view.setUint16(entry + 4, 1, true); // color planes
    view.setUint16(entry + 6, 32, true); // bits per pixel
    view.setUint32(entry + 8, png.length, true);
    view.setUint32(entry + 12, offset, true);
    out.set(png, offset);
    offset += png.length;
  });
  return out;
}
