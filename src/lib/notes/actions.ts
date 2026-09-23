"use server";

import { UnauthenticatedError, withUserDb } from "@/db/client";
import * as ops from "./operations";
import { validateNoteBody } from "./validate";

// Note body actions. They don't revalidate the layout: body text doesn't change
// the sidebar, and the client patches the note's "last edited" time itself.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export type SaveNoteResult = ops.SaveResult | { status: "error"; error: string };

function errorResult(error: unknown): { status: "error"; error: string } {
  if (error instanceof UnauthenticatedError) {
    return { status: "error", error: "Your session has ended. Sign in again to keep saving." };
  }
  console.error("[notes] unexpected error", { message: (error as Error)?.message });
  return { status: "error", error: "Couldn't save. Retrying…" };
}

export async function saveNote(itemId: string, body: unknown, baseVersion: number): Promise<SaveNoteResult> {
  if (!isId(itemId) || !Number.isInteger(baseVersion) || baseVersion < 0) {
    return { status: "error", error: "That request was not valid." };
  }
  const valid = validateNoteBody(body);
  if (!valid.ok) return { status: "error", error: valid.error };
  try {
    return await withUserDb((tx) => ops.saveNoteBody(tx, itemId, valid.doc, baseVersion));
  } catch (error) {
    return errorResult(error);
  }
}

export async function loadNote(itemId: string): Promise<ops.NoteBody | null> {
  if (!isId(itemId)) return null;
  return withUserDb((tx) => ops.getNoteBody(tx, itemId));
}

export async function noteVersion(itemId: string): Promise<number | null> {
  if (!isId(itemId)) return null;
  return withUserDb((tx) => ops.getNoteVersion(tx, itemId));
}
