import { getSchema, type JSONContent } from "@tiptap/core";
import type { Node as PMNode, Schema } from "@tiptap/pm/model";
import { noteExtensions } from "./extensions";
import { parseFontSize } from "./font-size";
import { isAllowedHref } from "./links";

/** Next.js accepts 1 MB Server Action bodies; leave room for the rest of the request. */
export const MAX_NOTE_BYTES = 800_000;

export const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

let schema: Schema | undefined;
const noteSchema = () => (schema ??= getSchema(noteExtensions()));

export type ValidationResult = { ok: true; doc: JSONContent } | { ok: false; error: string };

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
