import type { JSONContent } from "@tiptap/core";
import { and, eq, sql } from "drizzle-orm";
import type { UserTx } from "@/db/client";
import { itemContent, items } from "@/db/schema";
import { EMPTY_DOC } from "./validate";

// Note body storage (design D3), run inside a user transaction (RLS applies).
// Every save names the version it was based on; the version check sits in the
// UPDATE's WHERE clause, so two saves from the same base can't both succeed.

export type NoteBody = { body: JSONContent; version: number };

export type SaveResult =
  | { status: "saved"; version: number; editedAt: string }
  | { status: "conflict"; storedVersion: number }
  | { status: "not-found" };

const isActiveNote = async (tx: UserTx, itemId: string) => {
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
