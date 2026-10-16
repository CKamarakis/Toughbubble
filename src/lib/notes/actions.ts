"use server";

import { revalidatePath } from "next/cache";
import { UnauthenticatedError, withUserDb } from "@/db/client";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/tree/actions";
import { NOT_FOUND, treeErrorMessage } from "@/lib/tree/errors";
import * as ops from "./operations";
import { validateNoteBody } from "./validate";

// Note body actions. Saves don't revalidate the layout: body text doesn't change
// the sidebar, and the client patches the note's "last edited" time itself.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export type SaveNoteResult =
  | Exclude<ops.SaveResult, { status: "foreign-attachment" }>
  | { status: "error"; error: string };

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
    const result = await withUserDb((tx) => ops.saveNoteBody(tx, itemId, valid.doc, baseVersion));
    if (result.status === "foreign-attachment") {
      return { status: "error", error: "The note contains a file that isn't attached to it." };
    }
    return result;
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

/** Copies a note and its attachments; the sidebar order changes, so the layout is revalidated. */
export async function duplicateNote(id: string): Promise<ActionResult<string>> {
  if (!isId(id)) return { ok: false, error: "That request was not valid." };
  try {
    const bucket = (await createClient()).storage.from("attachments");
    const copyId = await ops.duplicateNoteCleanly(withUserDb, bucket, id);
    if (!copyId) return { ok: false, error: NOT_FOUND };
    revalidatePath("/", "layout");
    return { ok: true, value: copyId };
  } catch (error) {
    return { ok: false, error: treeErrorMessage(error) };
  }
}
