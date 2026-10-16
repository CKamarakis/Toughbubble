import { and, eq, inArray, isNull } from "drizzle-orm";
import { generateNKeysBetween } from "fractional-indexing";
import type { UserTx } from "@/db/client";
import { items } from "@/db/schema";
import { displayTitle } from "./build";
import { GROUP_KINDS, sidebarCompare } from "./order";

const MAX_TITLE = 200;
const COPY_SUFFIX = " (copy)";

/**
 * The item part of Duplicate (design D10), shared by notes and Storms: inserts
 * "<title> (copy)" (shortened to fit the title limit) in the same parent,
 * directly below the original. Returns the new id, or null if `id` is not an
 * active item of `kind`. The caller copies the content.
 */
export async function insertCopyBelow(tx: UserTx, id: string, kind: "note" | "storm"): Promise<string | null> {
  const [original] = await tx
    .select({ title: items.title, parentId: items.parentId, kind: items.kind, status: items.status })
    .from(items)
    .where(eq(items.id, id));
  if (original?.kind !== kind || original.status !== "active") return null;

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
    .values({ kind, parentId: original.parentId, title, position: "a0" })
    .returning({ id: items.id });
  ordered.splice(ordered.indexOf(id) + 1, 0, created.id);

  // Fresh keys for the whole group, as reorderGroup does: untouched groups all share 'a0'.
  const keys = generateNKeysBetween(null, null, ordered.length);
  for (const [i, itemId] of ordered.entries()) {
    await tx.update(items).set({ position: keys[i] }).where(eq(items.id, itemId));
  }
  return created.id;
}
