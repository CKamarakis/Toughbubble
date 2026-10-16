import type { JSONContent } from "@tiptap/core";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { UserTx } from "@/db/client";
import { attachments, itemContent, items } from "@/db/schema";
import {
  type Bucket,
  copyAttachments,
  recordingCopies,
  removeStoredFiles,
} from "@/lib/attachments/operations";
import { insertCopyBelow } from "@/lib/tree/duplicate";
import { attachmentIdsIn, EMPTY_DOC, withAttachmentIds } from "./validate";

// Note body storage (design D3), run inside a user transaction (RLS applies).
// Every save names the version it was based on; the version check sits in the
// UPDATE's WHERE clause, so two saves from the same base can't both succeed.

export type NoteBody = { body: JSONContent; version: number };

export type SaveResult =
  | { status: "saved"; version: number; editedAt: string }
  | { status: "conflict"; storedVersion: number }
  | { status: "foreign-attachment" }
  | { status: "not-found" };

export const isActiveNote = async (tx: UserTx, itemId: string) => {
  const [item] = await tx
    .select({ kind: items.kind, status: items.status })
    .from(items)
    .where(eq(items.id, itemId));
  return item?.kind === "note" && item.status === "active";
};

/** Saves an already-validated body. `baseVersion` 0 means "no content yet". */
export async function saveNoteBody(
  tx: UserTx,
  itemId: string,
  body: JSONContent,
  baseVersion: number,
): Promise<SaveResult> {
  if (!(await isActiveNote(tx, itemId))) return { status: "not-found" };

  // A body may only refer to this note's own attachments (spec: Private files).
  const ids = attachmentIdsIn(body);
  if (ids.length > 0) {
    const own = await tx
      .select({ id: attachments.id })
      .from(attachments)
      .where(and(eq(attachments.itemId, itemId), inArray(attachments.id, ids)));
    if (own.length !== ids.length) return { status: "foreign-attachment" };
  }

  const saved =
    baseVersion === 0
      ? await tx
          .insert(itemContent)
          .values({ itemId, body })
          .onConflictDoNothing()
          .returning({ version: itemContent.version })
      : await tx
          .update(itemContent)
          .set({ body, version: sql`${itemContent.version} + 1` })
          .where(and(eq(itemContent.itemId, itemId), eq(itemContent.version, baseVersion)))
          .returning({ version: itemContent.version });

  if (saved.length === 0) {
    const [stored] = await tx
      .select({ version: itemContent.version })
      .from(itemContent)
      .where(eq(itemContent.itemId, itemId));
    return { status: "conflict", storedVersion: stored?.version ?? 0 };
  }

  // Saving the body is an edit (drives the "Last edited" sort).
  const [touched] = await tx
    .update(items)
    .set({ editedAt: sql`now()` })
    .where(eq(items.id, itemId))
    .returning({ editedAt: items.editedAt });
  return { status: "saved", version: saved[0].version, editedAt: touched.editedAt.toISOString() };
}

/** The stored body and version; an empty document at version 0 if never saved. Null if not an active note. */
export async function getNoteBody(tx: UserTx, itemId: string): Promise<NoteBody | null> {
  if (!(await isActiveNote(tx, itemId))) return null;
  const [row] = await tx
    .select({ body: itemContent.body, version: itemContent.version })
    .from(itemContent)
    .where(eq(itemContent.itemId, itemId));
  return row ? { body: row.body as JSONContent, version: row.version } : { body: EMPTY_DOC, version: 0 };
}

/** Just the stored version (0 if never saved), for the quiet refresh. Null if not an active note. */
export async function getNoteVersion(tx: UserTx, itemId: string): Promise<number | null> {
  if (!(await isActiveNote(tx, itemId))) return null;
  const [row] = await tx
    .select({ version: itemContent.version })
    .from(itemContent)
    .where(eq(itemContent.itemId, itemId));
  return row?.version ?? 0;
}

/**
 * Copies an active note: "<title> (copy)" with the same body, placed right
 * below the original (design D10). Each attachment in the body is copied as a
 * file of its own and the copied body points at the copies; one that fails to
 * copy is dropped from the copy's body. A never-written note copies empty.
 * Returns the new id, or null if `id` is not an active note.
 *
 * Order: item row (so copyAttachments sees an active target) → Storage copies
 * and their rows → rewritten body. Storage isn't transactional; callers use
 * `duplicateNoteCleanly` to remove the copied files if the transaction fails.
 */
export async function duplicateNote(tx: UserTx, bucket: Bucket, id: string): Promise<string | null> {
  const copyId = await insertCopyBelow(tx, id, "note");
  if (!copyId) return null;

  const [row] = await tx.select({ body: itemContent.body }).from(itemContent).where(eq(itemContent.itemId, id));
  if (!row) return copyId;

  const body = row.body as JSONContent;
  const ids = attachmentIdsIn(body);
  const copies = ids.length > 0 ? ((await copyAttachments(tx, bucket, copyId, ids)) ?? {}) : {};
  await tx.insert(itemContent).values({ itemId: copyId, body: withAttachmentIds(body, copies), version: 1 });
  return copyId;
}

/**
 * Runs `duplicateNote` in `run`'s transaction. If the transaction fails after
 * files were copied, the copies are orphans under a note that was never
 * created, so they are removed (never throws for that; the purge job is the
 * fallback) and the error is rethrown.
 */
export async function duplicateNoteCleanly(
  run: <T>(fn: (tx: UserTx) => Promise<T>) => Promise<T>,
  bucket: Bucket,
  id: string,
): Promise<string | null> {
  const { bucket: recording, copied } = recordingCopies(bucket);
  try {
    return await run((tx) => duplicateNote(tx, recording, id));
  } catch (error) {
    if (copied.length > 0) await removeStoredFiles(bucket, copied);
    throw error;
  }
}
