import { getSchema, type JSONContent } from "@tiptap/core";
import type { Node as PMNode, Schema } from "@tiptap/pm/model";
import { IMAGE_ALIGNMENTS, MAX_IMAGE_WIDTH, MIN_IMAGE_WIDTH } from "./attachment-nodes";
import { noteExtensions } from "./extensions";
import { parseFontSize } from "./font-size";
import { isAllowedHref } from "./links";

/** Next.js accepts 1 MB Server Action bodies; leave room for the rest of the request. */
export const MAX_NOTE_BYTES = 800_000;

export const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

let schema: Schema | undefined;
const noteSchema = () => (schema ??= getSchema(noteExtensions()));

export type ValidationResult = { ok: true; doc: JSONContent } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isIdOrNull = (v: unknown) => v === null || (typeof v === "string" && UUID.test(v));

/** Image and file nodes must name an attachment (or a copy in flight) and keep their attributes in range. */
function attachmentProblem(node: PMNode): string | null {
  const { attachmentId, copyOf } = node.attrs;
  if (!isIdOrNull(attachmentId) || !isIdOrNull(copyOf) || (attachmentId === null && copyOf === null)) {
    return "The note contains a file that isn't attached to it.";
  }
  if (node.type.name === "image") {
    const { width, align, alt } = node.attrs;
    const widthOk = width === null || (Number.isInteger(width) && width >= MIN_IMAGE_WIDTH && width <= MAX_IMAGE_WIDTH);
    const alignOk = (IMAGE_ALIGNMENTS as readonly string[]).includes(align);
    const altOk = alt === null || (typeof alt === "string" && alt.length <= 500);
    if (!widthOk || !alignOk || !altOk) return "The note contains an image setting that isn't allowed.";
  } else {
    const { name, mimeType, size } = node.attrs;
    const ok =
      (name === null || (typeof name === "string" && name.length <= 200)) &&
      (mimeType === null || (typeof mimeType === "string" && mimeType.length <= 255)) &&
      (size === null || (Number.isInteger(size) && size >= 0));
    if (!ok) return "The note contains a file card that isn't valid.";
  }
  return null;
}

/** Attachment ids a stored body refers to (copies in flight are not included). */
export function attachmentIdsIn(doc: JSONContent): string[] {
  const ids = new Set<string>();
  const visit = (node: JSONContent) => {
    if ((node.type === "image" || node.type === "fileAttachment") && typeof node.attrs?.attachmentId === "string") {
      ids.add(node.attrs.attachmentId);
    }
    node.content?.forEach(visit);
  };
  visit(doc);
  return [...ids];
}

/**
 * Checks a note body before it is stored: it must parse with the editor's
 * schema (known nodes and marks, valid nesting), links must use allowed
 * schemes, font sizes must be 8–96 px, and it must fit the size limit.
 */
export function validateNoteBody(body: unknown): ValidationResult {
  let json: string;
  try {
    json = JSON.stringify(body);
  } catch {
    return { ok: false, error: "The note could not be read." };
  }
  if (json === undefined || new TextEncoder().encode(json).length > MAX_NOTE_BYTES) {
    return { ok: false, error: "This note is too long to save. Split it into smaller notes." };
  }
  if (!body || typeof body !== "object" || (body as JSONContent).type !== "doc") {
    return { ok: false, error: "The note could not be read." };
  }

  let doc: PMNode;
  try {
    doc = noteSchema().nodeFromJSON(body);
    doc.check(); // content and attributes valid for the schema
  } catch {
    return { ok: false, error: "The note contains content that can't be saved." };
  }

  let problem: string | null = null;
  doc.descendants((node) => {
    if (node.type.name === "image" || node.type.name === "fileAttachment") {
      problem = attachmentProblem(node);
      return !problem;
    }
    for (const mark of node.marks) {
      if (mark.type.name === "link" && !isAllowedHref(mark.attrs.href)) {
        problem = "The note contains a link address that isn't allowed.";
      }
      if (mark.type.name === "textStyle" && mark.attrs.fontSize != null && !parseFontSize(mark.attrs.fontSize)) {
        problem = "The note contains a font size outside 8–96 px.";
      }
    }
    return !problem;
  });
  if (problem) return { ok: false, error: problem };

  return { ok: true, doc: doc.toJSON() as JSONContent };
}
