import { eq, sql } from "drizzle-orm";
import type { UserTx } from "@/db/client";
import { itemContent, items } from "@/db/schema";
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
