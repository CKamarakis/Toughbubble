import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { generateNKeysBetween } from "fractional-indexing";
import type { UserTx } from "@/db/client";
import { itemContent, items } from "@/db/schema";
import { displayTitle } from "@/lib/tree/build";
import { GROUP_KINDS, sidebarCompare } from "@/lib/tree/order";
import type { ChangeSet } from "./changeset";
import { MAX_BODY_BYTES } from "./limits";
import { EMPTY_BOARD, type StormBody } from "./model";
import { isStormBody } from "./validate";

// Storm board storage (design D3), run inside a user transaction (RLS applies).
// A save sends a change set, merged into the stored body in one statement. The
// version check and the size cap sit in that statement's WHERE clause, so two
// saves from the same base can't both succeed and an oversized body is never written.

export type StormBoard = { body: StormBody; version: number };

export type SaveStormResult =
  | { status: "saved"; version: number; editedAt: string }
  | { status: "conflict"; storedVersion: number }
  | { status: "too-large" }
  | { status: "not-found" };

export const isActiveStorm = async (tx: UserTx, itemId: string) => {
  const [item] = await tx
    .select({ kind: items.kind, status: items.status })
    .from(items)
    .where(eq(items.id, itemId));
  return item?.kind === "storm" && item.status === "active";
};

/** The stored board and version; an empty board at version 0 if never saved. Null if not an active Storm. */
export async function getStormBody(tx: UserTx, itemId: string): Promise<StormBoard | null> {
  if (!(await isActiveStorm(tx, itemId))) return null;
  const [row] = await tx
    .select({ body: itemContent.body, version: itemContent.version })
    .from(itemContent)
    .where(eq(itemContent.itemId, itemId));
  if (!row) return { body: EMPTY_BOARD, version: 0 };
  if (!isStormBody(row.body)) {
    // Never throw on load: show an empty board, but keep the version so a save still lines up.
    console.error("[storms] stored body is not a board", { itemId, version: row.version });
    return { body: EMPTY_BOARD, version: row.version };
  }
  return { body: row.body, version: row.version };
}

/** Just the stored version (0 if never saved). Null if not an active Storm. */
export async function getStormVersion(tx: UserTx, itemId: string): Promise<number | null> {
  if (!(await isActiveStorm(tx, itemId))) return null;
  const [row] = await tx
    .select({ version: itemContent.version })
    .from(itemContent)
    .where(eq(itemContent.itemId, itemId));
  return row?.version ?? 0;
}

const MAX_TITLE = 200;
const COPY_SUFFIX = " (copy)";

/**
 * Copies an active Storm: "<title> (copy)" with the same board, placed right
 * below the original (design D10). Returns the new id, or null if `id` is not
 * an active Storm.
 */
export async function duplicateStorm(tx: UserTx, id: string): Promise<string | null> {
  const [original] = await tx
    .select({ title: items.title, parentId: items.parentId, kind: items.kind, status: items.status })
    .from(items)
    .where(eq(items.id, id));
  if (original?.kind !== "storm" || original.status !== "active") return null;

  const base = displayTitle(original);
  const title = base.slice(0, MAX_TITLE - COPY_SUFFIX.length) + COPY_SUFFIX;

  // Lock the group so a concurrent reorder or create can't interleave.
  const siblings = await tx
    .select({
      id: items.id,
      kind: items.kind,
      title: items.title,
      position: items.position,
      createdAt: items.createdAt,
      editedAt: items.editedAt,
    })
    .from(items)
    .where(
      and(
        original.parentId ? eq(items.parentId, original.parentId) : isNull(items.parentId),
        eq(items.status, "active"),
        inArray(items.kind, GROUP_KINDS[2]),
      ),
    )
    .for("update");
  const ordered = siblings
    .map((s) => ({ ...s, createdAt: s.createdAt.toISOString(), editedAt: s.editedAt.toISOString() }))
    .sort(sidebarCompare)
    .map((s) => s.id);

  const [created] = await tx
    .insert(items)
    .values({ kind: "storm", parentId: original.parentId, title, position: "a0" })
    .returning({ id: items.id });
  ordered.splice(ordered.indexOf(id) + 1, 0, created.id);

  // Fresh keys for the whole group, as reorderGroup does: untouched groups all share 'a0'.
  const keys = generateNKeysBetween(null, null, ordered.length);
  for (const [i, itemId] of ordered.entries()) {
    await tx.update(items).set({ position: keys[i] }).where(eq(items.id, itemId));
  }

  await tx.execute(sql`
    insert into item_content (item_id, body, version)
    select ${created.id}, body, 1 from item_content where item_id = ${id}`);
  return created.id;
}

/** Applies an already-validated change set. `baseVersion` 0 means "no content yet". */
export async function saveStormChanges(
  tx: UserTx,
  itemId: string,
  cs: ChangeSet,
  baseVersion: number,
): Promise<SaveStormResult> {
  if (!(await isActiveStorm(tx, itemId))) return { status: "not-found" };

  // Ids are validated UUIDs, so a plain array literal is safe.
  const dels = sql`${`{${cs.delete.join(",")}}`}::text[]`;
  const upserts = sql`${JSON.stringify(Object.fromEntries(cs.upsert.map((i) => [i.id, i])))}::jsonb`;
  const merged = (body: ReturnType<typeof sql>) =>
    sql`jsonb_set(${body}, '{items}', ((${body}->'items') - ${dels}) || ${upserts})`;

  let saved: { version: number }[];
  if (baseVersion === 0) {
    const empty = sql`${JSON.stringify(EMPTY_BOARD)}::jsonb`;
    saved = await tx.execute<{ version: number }>(sql`
      insert into item_content (item_id, body)
      select ${itemId}, m.body
      from (select ${merged(empty)} as body) m
      where octet_length(m.body::text) <= ${MAX_BODY_BYTES}
      on conflict do nothing
      returning version`);
  } else {
    const body = sql.raw("body");
    saved = await tx.execute<{ version: number }>(sql`
      update item_content set
        body = ${merged(body)},
        version = version + 1,
        updated_at = now()
      where item_id = ${itemId} and version = ${baseVersion}
        and octet_length((${merged(body)})::text) <= ${MAX_BODY_BYTES}
      returning version`);
  }

  if (saved.length === 0) {
    const [stored] = await tx
      .select({ version: itemContent.version })
      .from(itemContent)
      .where(eq(itemContent.itemId, itemId));
    const storedVersion = stored?.version ?? 0;
    // The base matched, so the only reason left for no row is the size cap.
    return storedVersion === baseVersion ? { status: "too-large" } : { status: "conflict", storedVersion };
  }

  // Saving the board is an edit (drives the "Last edited" sort).
  const [touched] = await tx
    .update(items)
    .set({ editedAt: sql`now()` })
    .where(eq(items.id, itemId))
    .returning({ editedAt: items.editedAt });
  return { status: "saved", version: Number(saved[0].version), editedAt: touched.editedAt.toISOString() };
}
