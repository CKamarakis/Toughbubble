// Attachment rules shared by the browser and the server (spec: note-attachments).

/** Largest file stored, after images are scaled down. Matches the bucket's limit. */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/** Shown as images in the text; every other type (SVG included) is a file card. */
export const INLINE_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;

export const isInlineImage = (mimeType: string) =>
  (INLINE_IMAGE_TYPES as readonly string[]).includes(mimeType);

const MAX_NAME_LENGTH = 200;

/** Display and download name: control characters removed, trimmed, at most 200 characters. */
export function cleanFileName(name: unknown): string {
  const cleaned = typeof name === "string" ? name.replace(/[\u0000-\u001f\u007f]/g, "").trim() : "";
  return [...(cleaned || "file")].slice(0, MAX_NAME_LENGTH).join("");
}

/** A MIME type as the browser reported it, or a generic one. */
export function cleanMimeType(type: unknown): string {
  return typeof type === "string" && /^[\w.+-]+\/[\w.+-]+$/.test(type) && type.length <= 255
    ? type.toLowerCase()
    : "application/octet-stream";
}

/** Object path in the bucket; the first segment is the owner, as the Storage policies require. */
export const storagePath = (ownerId: string, itemId: string, attachmentId: string) =>
  `${ownerId}/${itemId}/${attachmentId}`;

const UNITS = ["B", "KB", "MB", "GB"];

export function formatFileSize(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${unit === 0 ? value : value.toFixed(value < 10 ? 1 : 0)} ${UNITS[unit]}`;
}

export const tooLargeMessage = (name: string) => `"${name}" is larger than 5 MB, so it wasn't attached.`;
