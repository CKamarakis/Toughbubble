import { isInlineImage } from "./rules";

// Scaling images down in the browser before upload (attachments design D6),
// so only one reasonably sized copy is stored. The decisions are plain
// functions; prepareFile() does the canvas work in the browser.

/** Longest side stored for PNG, JPEG, and WebP images. */
export const MAX_IMAGE_SIDE = 2560;
/** Images at or under MAX_IMAGE_SIDE are re-compressed only above this size. */
export const RECOMPRESS_BYTES = 1.5 * 1024 * 1024;
export const QUALITY = 0.85;

const SCALABLE = ["image/png", "image/jpeg", "image/webp"];

export type ImagePlan = { action: "keep" } | { action: "process"; width: number; height: number };

/** Whether to process an image, and at what size. GIFs and other types are kept. */
export function planImage(type: string, bytes: number, width: number, height: number): ImagePlan {
  if (!SCALABLE.includes(type) || width <= 0 || height <= 0) return { action: "keep" };
  const longer = Math.max(width, height);
  if (longer > MAX_IMAGE_SIDE) {
    const scale = MAX_IMAGE_SIDE / longer;
    return {
      action: "process",
      width: width >= height ? MAX_IMAGE_SIDE : Math.round(width * scale),
      height: height > width ? MAX_IMAGE_SIDE : Math.round(height * scale),
    };
  }
  if (bytes > RECOMPRESS_BYTES) return { action: "process", width, height };
  return { action: "keep" };
}

/** Output type when the browser can't encode WebP: JPEG stays JPEG; PNG and WebP become PNG to keep transparency. */
export const fallbackType = (inputType: string) => (inputType === "image/jpeg" ? "image/jpeg" : "image/png");

const EXTENSIONS: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

/** The file name with its extension changed to match a new type. */
export function renameForType(name: string, type: string): string {
  const ext = EXTENSIONS[type];
  if (!ext) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.${ext}`;
}

export type PreparedFile = { file: File; width: number | null; height: number | null };

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));

/**
 * Browser only. Images shown inline get their dimensions read; PNG, JPEG, and
 * WebP images are scaled down or re-compressed per planImage, keeping the
 * smaller of the original and the result. Files that can't be decoded are
 * returned unchanged.
 */
export async function prepareFile(file: File): Promise<PreparedFile> {
  if (!isInlineImage(file.type)) return { file, width: null, height: null };

  let bitmap: ImageBitmap;
  try {
    // "from-image" applies EXIF orientation, so phone photos stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return { file, width: null, height: null };
  }

  try {
    const plan = planImage(file.type, file.size, bitmap.width, bitmap.height);
    if (plan.action === "keep") return { file, width: bitmap.width, height: bitmap.height };

    const canvas = document.createElement("canvas");
    canvas.width = plan.width;
    canvas.height = plan.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, width: bitmap.width, height: bitmap.height };
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, plan.width, plan.height);

    // Browsers that can't encode WebP return PNG instead.
    let blob = await toBlob(canvas, "image/webp");
    if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, fallbackType(file.type));
    if (!blob) return { file, width: bitmap.width, height: bitmap.height };

    // Only one copy is stored: whichever is smaller.
    if (blob.size >= file.size) return { file, width: bitmap.width, height: bitmap.height };

    const out = new File([blob], renameForType(file.name, blob.type), { type: blob.type, lastModified: file.lastModified });
    return { file: out, width: plan.width, height: plan.height };
  } finally {
    bitmap.close();
  }
}
