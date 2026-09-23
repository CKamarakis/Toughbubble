import { describe, expect, it } from "vitest";
import { fallbackType, MAX_IMAGE_SIDE, planImage, RECOMPRESS_BYTES, renameForType } from "./prepare-image";
import { cleanFileName, cleanMimeType, formatFileSize, isInlineImage, MAX_ATTACHMENT_BYTES } from "./rules";

const MB = 1024 * 1024;

describe("planImage", () => {
  it("scales a landscape phone photo to 2560 px on the longer side", () => {
    expect(planImage("image/jpeg", 3 * MB, 4032, 3024)).toEqual({ action: "process", width: 2560, height: 1920 });
  });

  it("scales a portrait image by its height", () => {
    expect(planImage("image/png", 100_000, 3000, 6000)).toEqual({ action: "process", width: 1280, height: 2560 });
  });

  it("keeps small images and re-compresses large files at their size", () => {
    expect(planImage("image/png", 200_000, 800, 600)).toEqual({ action: "keep" });
    expect(planImage("image/png", RECOMPRESS_BYTES, 800, 600)).toEqual({ action: "keep" });
    expect(planImage("image/jpeg", RECOMPRESS_BYTES + 1, 2000, 1500)).toEqual({ action: "process", width: 2000, height: 1500 });
    expect(planImage("image/webp", 100, MAX_IMAGE_SIDE, 10)).toEqual({ action: "keep" });
  });

  it("never processes GIFs or other types", () => {
    expect(planImage("image/gif", 4 * MB, 4000, 4000)).toEqual({ action: "keep" });
    expect(planImage("image/svg+xml", 4 * MB, 4000, 4000)).toEqual({ action: "keep" });
    expect(planImage("image/heic", 4 * MB, 4000, 4000)).toEqual({ action: "keep" });
  });

  it("falls back to a type that keeps transparency", () => {
    expect(fallbackType("image/jpeg")).toBe("image/jpeg");
    expect(fallbackType("image/png")).toBe("image/png");
    expect(fallbackType("image/webp")).toBe("image/png");
  });

  it("renames files to match the new type", () => {
    expect(renameForType("IMG_0001.JPG", "image/webp")).toBe("IMG_0001.webp");
    expect(renameForType("chart.v2.png", "image/png")).toBe("chart.v2.png");
    expect(renameForType("noext", "image/jpeg")).toBe("noext.jpg");
  });
});

describe("attachment rules", () => {
  it("shows PNG, JPEG, GIF, and WebP inline; SVG and others as cards", () => {
    for (const t of ["image/png", "image/jpeg", "image/gif", "image/webp"]) expect(isInlineImage(t)).toBe(true);
    for (const t of ["image/svg+xml", "image/heic", "application/pdf", ""]) expect(isInlineImage(t)).toBe(false);
  });

  it("limits files to 5 MB", () => {
    expect(MAX_ATTACHMENT_BYTES).toBe(5 * MB);
  });

  it("cleans names and types", () => {
    expect(cleanFileName("  a\u0000b.pdf ")).toBe("ab.pdf");
    expect(cleanFileName("")).toBe("file");
    expect(cleanFileName(42)).toBe("file");
    expect([...cleanFileName("é".repeat(300))].length).toBe(200);
    expect(cleanMimeType("Image/PNG")).toBe("image/png");
    expect(cleanMimeType("text/html; charset=utf-8")).toBe("application/octet-stream");
    expect(cleanMimeType(undefined)).toBe("application/octet-stream");
  });

  it("formats sizes", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(5 * MB)).toBe("5.0 MB");
    expect(formatFileSize(12 * MB)).toBe("12 MB");
  });
});
