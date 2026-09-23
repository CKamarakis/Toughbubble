import type { SupabaseClient } from "@supabase/supabase-js";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { UserTx } from "@/db/client";
import { attachments } from "@/db/schema";
import { isActiveNote } from "@/lib/notes/operations";
import { cleanFileName, cleanMimeType, isInlineImage, MAX_ATTACHMENT_BYTES, storagePath } from "./rules";

// Attachment records and their stored files (attachments design D2–D5).
// Database calls run in a user transaction (RLS applies); Storage calls use
// the signed-in user's own client, so Storage RLS applies too.

export type Bucket = ReturnType<SupabaseClient["storage"]["from"]>;

/** Signed links expire after 1 hour (spec: Private files). */
export const LINK_SECONDS = 60 * 60;

export type AttachmentMeta = {
  name: unknown;
  type: unknown;
  size: unknown;
  width?: unknown;
  height?: unknown;
};

const dimension = (v: unknown) => (Number.isInteger(v) && (v as number) > 0 && (v as number) <= 20_000 ? (v as number) : null);

export type StartResult =
  | { status: "started"; id: string; path: string; name: string; mimeType: string }
  | { status: "too-large" }
  | { status: "not-found" };

/** Records a pending upload for an active note and returns where to upload it. */
export async function startAttachment(tx: UserTx, itemId: string, meta: AttachmentMeta): Promise<StartResult> {
  const size = meta.size;
  if (!Number.isInteger(size) || (size as number) < 0) return { status: "not-found" };
  if ((size as number) > MAX_ATTACHMENT_BYTES) return { status: "too-large" };
  if (!(await isActiveNote(tx, itemId))) return { status: "not-found" };

  const name = cleanFileName(meta.name);
  const mimeType = cleanMimeType(meta.type);
  const image = isInlineImage(mimeType);
  const [row] = await tx
    .insert(attachments)
    .values({
      itemId,
      name,
      mimeType,
      sizeBytes: size as number,
      width: image ? dimension(meta.width) : null,
      height: image ? dimension(meta.height) : null,
    })
    .returning({ id: attachments.id, ownerId: attachments.ownerId });
  return { status: "started", id: row.id, path: storagePath(row.ownerId, itemId, row.id), name, mimeType };
}

const pathOf = (row: { ownerId: string; itemId: string; id: string }) => storagePath(row.ownerId, row.itemId, row.id);

export type FinishResult = { status: "ready"; link: string } | { status: "missing" } | { status: "not-found" };

/** Marks an upload ready once its file is in Storage, recording the stored size. */
export async function finishAttachment(tx: UserTx, bucket: Bucket, id: string): Promise<FinishResult> {
  const [row] = await tx.select().from(attachments).where(eq(attachments.id, id));
  if (!row || !(await isActiveNote(tx, row.itemId))) return { status: "not-found" };

  const path = pathOf(row);
  const info = await bucket.info(path);
  if (info.error || info.data.size == null) return { status: "missing" };

  await tx
    .update(attachments)
    .set({ status: "ready", sizeBytes: info.data.size })
    .where(eq(attachments.id, id));
  const signed = await bucket.createSignedUrl(path, LINK_SECONDS);
  if (signed.error) return { status: "missing" };
  return { status: "ready", link: signed.data.signedUrl };
}

/**
 * Signed links for ready attachments of an active note, by attachment id.
 * With `ids`, only those; attachments of other notes are never included.
 */
export async function getAttachmentLinks(
  tx: UserTx,
  bucket: Bucket,
  itemId: string,
  ids?: string[],
): Promise<Record<string, string>> {
  if (ids?.length === 0 || !(await isActiveNote(tx, itemId))) return {};
  const rows = await tx
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.itemId, itemId),
        eq(attachments.status, "ready"),
        ids ? inArray(attachments.id, ids) : undefined,
      ),
    );
  if (rows.length === 0) return {};

  const byPath = new Map(rows.map((row) => [pathOf(row), row.id]));
  const signed = await bucket.createSignedUrls([...byPath.keys()], LINK_SECONDS);
  if (signed.error) throw signed.error;
  const links: Record<string, string> = {};
  for (const entry of signed.data) {
    const id = entry.path ? byPath.get(entry.path) : undefined;
    if (id && entry.signedUrl) links[id] = entry.signedUrl;
  }
  return links;
}

/** A link that downloads the file under its original name, or null. */
export async function getDownloadLink(tx: UserTx, bucket: Bucket, id: string): Promise<string | null> {
  const [row] = await tx
    .select()
    .from(attachments)
    .where(and(eq(attachments.id, id), eq(attachments.status, "ready")));
  if (!row || !(await isActiveNote(tx, row.itemId))) return null;
  const signed = await bucket.createSignedUrl(pathOf(row), LINK_SECONDS, { download: row.name });
  return signed.error ? null : signed.data.signedUrl;
}

/**
 * Copies the user's ready attachments into another active note (attachments
 * design D7), so a pasted image keeps working if its original note is deleted.
 * Returns new ids by original id; ids that aren't the user's ready attachments
 * are left out. Attachments already on the target note map to themselves.
 */
export async function copyAttachments(
  tx: UserTx,
  bucket: Bucket,
  itemId: string,
  ids: string[],
): Promise<Record<string, string> | null> {
  if (!(await isActiveNote(tx, itemId))) return null;
  if (ids.length === 0) return {};
  const sources = await tx
    .select()
    .from(attachments)
    .where(and(inArray(attachments.id, ids), eq(attachments.status, "ready")));

  const copied: Record<string, string> = {};
  for (const source of sources) {
    if (source.itemId === itemId) {
      copied[source.id] = source.id;
      continue;
    }
    const id = crypto.randomUUID();
    const target = { ownerId: source.ownerId, itemId, id };
    const copy = await bucket.copy(pathOf(source), pathOf(target));
    if (copy.error) {
      console.error("[attachments] copy failed", { message: copy.error.message });
      continue;
    }
    const { name, mimeType, sizeBytes, width, height } = source;
    await tx.insert(attachments).values({ id, itemId, name, mimeType, sizeBytes, width, height, status: "ready" });
    copied[source.id] = id;
  }
  return copied;
}

/** Storage paths of the attachments on an item and everything inside it (design D8). */
export async function attachmentPathsUnder(tx: UserTx, itemId: string): Promise<string[]> {
  const rows = await tx.execute<{ owner_id: string; item_id: string; id: string }>(sql`
    with recursive t as (
      select id from items where id = ${itemId}
      union all
      select i.id from items i join t on i.parent_id = t.id
    )
    select a.owner_id, a.item_id, a.id from attachments a join t on a.item_id = t.id`);
  return rows.map((r) => storagePath(r.owner_id, r.item_id, r.id));
}

const REMOVE_BATCH = 100;

/**
 * Removes stored files after their rows are gone. Never throws: a failure is
 * logged and the files are left for the purge job. Returns false on failure.
 */
export async function removeStoredFiles(bucket: Bucket, paths: string[]): Promise<boolean> {
  let ok = true;
  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    try {
      const { error } = await bucket.remove(paths.slice(i, i + REMOVE_BATCH));
      if (error) throw error;
    } catch (error) {
      ok = false;
      console.error("[attachments] remove failed; files left for the purge job", {
        count: Math.min(REMOVE_BATCH, paths.length - i),
        message: (error as Error)?.message,
      });
    }
  }
  return ok;
}
