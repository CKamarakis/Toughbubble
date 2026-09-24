import { and, desc, eq, inArray, isNull, min, ne, sql } from "drizzle-orm";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import type { UserTx } from "@/db/client";
import { items } from "@/db/schema";
import { GROUP_KINDS, kindGroup, type KindGroup } from "./order";
import type { ItemKind, TreeRow } from "./types";

// Database work for the tree, run inside a user transaction (RLS applies).
// Server Actions wrap these with validation and error messages; integration
// tests call them directly through runAsUser.

const treeColumns = {
  id: items.id,
  parentId: items.parentId,
  kind: items.kind,
  title: items.title,
  icon: items.icon,
  color: items.color,
  position: items.position,
  createdAt: items.createdAt,
  editedAt: items.editedAt,
};

const toRow = (r: {
  id: string;
  parentId: string | null;
  kind: ItemKind;
  title: string;
  icon: string | null;
  color: string | null;
  position: string;
  createdAt: Date;
  editedAt: Date;
}): TreeRow => ({ ...r, createdAt: r.createdAt.toISOString(), editedAt: r.editedAt.toISOString() });

/** Every active item: the whole sidebar tree (design D1). */
export async function loadActiveTree(tx: UserTx): Promise<TreeRow[]> {
  const rows = await tx.select(treeColumns).from(items).where(eq(items.status, "active"));
  return rows.map(toRow);
}

/** One active item, or undefined if missing, someone else's, archived, or trashed. */
export async function getActiveItem(tx: UserTx, id: string): Promise<TreeRow | undefined> {
  const [row] = await tx
    .select(treeColumns)
    .from(items)
    .where(and(eq(items.id, id), eq(items.status, "active")));
  return row && toRow(row);
}

export type StatusRoot = TreeRow & { statusChangedAt: string };

/** Items archived or trashed directly (not the items inside them), newest first. */
export async function loadStatusRoots(
  tx: UserTx,
  status: "archived" | "trashed",
): Promise<StatusRoot[]> {
  const rows = await tx
    .select({ ...treeColumns, statusChangedAt: items.statusChangedAt })
    .from(items)
    .where(and(eq(items.status, status), eq(items.statusRootId, items.id)))
    .orderBy(desc(items.statusChangedAt));
  return rows.map((r) => ({
    ...toRow(r),
    statusChangedAt: (r.statusChangedAt ?? r.editedAt).toISOString(),
  }));
}

const sameParent = (parentId: string | null) => (parentId ? eq(items.parentId, parentId) : isNull(items.parentId));

/**
 * A position before every active item of `kind`'s group under `parentId`, so
 * a new or moved item comes first (sidebar-manual-order D3). `except` leaves
 * out the item being moved.
 */
async function topPosition(tx: UserTx, parentId: string | null, kind: ItemKind, except?: string) {
  const [row] = await tx
    .select({ first: min(items.position) })
    .from(items)
    .where(
      and(
        sameParent(parentId),
        eq(items.status, "active"),
        inArray(items.kind, GROUP_KINDS[kindGroup(kind)]),
        except ? ne(items.id, except) : undefined,
      ),
    );
  return row?.first ? generateKeyBetween(null, row.first) : "a0";
}

export async function createItem(tx: UserTx, kind: ItemKind, parentId: string | null) {
  const position = await topPosition(tx, parentId, kind);
  const [row] = await tx.insert(items).values({ kind, parentId, position }).returning({ id: items.id });
  return row.id;
}

const activeItem = (id: string) => and(eq(items.id, id), eq(items.status, "active"));

/** Each edit returns whether an active item was changed. */
export async function renameItem(tx: UserTx, id: string, title: string) {
  const rows = await tx
    .update(items)
    .set({ title, editedAt: sql`now()` })
    .where(activeItem(id))
    .returning({ id: items.id });
  return rows.length > 0;
}

export async function setProjectStyle(
  tx: UserTx,
  id: string,
  style: { icon: string | null; color: string | null },
) {
  const rows = await tx
    .update(items)
    .set({ ...style, editedAt: sql`now()` })
    .where(and(activeItem(id), eq(items.kind, "project")))
    .returning({ id: items.id });
  return rows.length > 0;
}

/** Folder to project keeps icon/color empty; project to folder clears them. */
export async function convertItem(tx: UserTx, id: string, to: "project" | "folder") {
  const rows = await tx
    .update(items)
    .set({
      kind: to,
      editedAt: sql`now()`,
      ...(to === "folder" ? { icon: null, color: null } : {}),
    })
    .where(and(activeItem(id), inArray(items.kind, ["project", "folder"])))
    .returning({ id: items.id });
  return rows.length > 0;
}

/**
 * Moves into a container or to the root (null), first in its group there.
 * Tree rules are enforced by triggers.
 */
export async function moveItem(tx: UserTx, id: string, parentId: string | null) {
  const [item] = await tx.select({ kind: items.kind }).from(items).where(activeItem(id));
  if (!item) return false;
  const position = await topPosition(tx, parentId, item.kind, id);
  const rows = await tx
    .update(items)
    .set({ parentId, position, editedAt: sql`now()` })
    .where(activeItem(id))
    .returning({ id: items.id });
  return rows.length > 0;
}

/**
 * Rewrites the order of one kind group under one parent (sidebar-manual-order
 * D2). `orderedIds` must be exactly the group's active items; otherwise
 * nothing changes and false is returned (the list changed elsewhere). The
 * whole group gets fresh keys, since untouched groups all share 'a0'.
 * Reordering isn't an edit, so edited_at stays.
 */
export async function reorderGroup(
  tx: UserTx,
  parentId: string | null,
  group: KindGroup,
  orderedIds: string[],
): Promise<boolean> {
  const siblings = await tx
    .select({ id: items.id })
    .from(items)
    .where(and(sameParent(parentId), eq(items.status, "active"), inArray(items.kind, GROUP_KINDS[group])))
    .for("update");
  const current = new Set(siblings.map((s) => s.id));
  const wanted = new Set(orderedIds);
  if (wanted.size !== orderedIds.length || wanted.size !== current.size || orderedIds.some((id) => !current.has(id))) {
    return false;
  }
  const keys = generateNKeysBetween(null, null, orderedIds.length);
  for (const [i, id] of orderedIds.entries()) {
    await tx.update(items).set({ position: keys[i] }).where(eq(items.id, id));
  }
  return true;
}

// Archive and trash change the item and the descendants reached through items
// that are not already in the target state; items archived or trashed
// separately keep their own root (design D3).

export async function archiveItem(tx: UserTx, id: string) {
  const rows = await tx.execute(sql`
    with recursive t as (
      select id from items where id = ${id} and status = 'active'
      union all
      select i.id from items i join t on i.parent_id = t.id where i.status = 'active'
    )
    update items set status = 'archived', status_root_id = ${id}, status_changed_at = now()
    where id in (select id from t)
    returning id`);
  return rows.length > 0;
}

export async function trashItem(tx: UserTx, id: string) {
  const rows = await tx.execute(sql`
    with recursive t as (
      select id from items where id = ${id} and status <> 'trashed'
      union all
      select i.id from items i join t on i.parent_id = t.id where i.status <> 'trashed'
    )
    update items set status = 'trashed', status_root_id = ${id}, status_changed_at = now()
    where id in (select id from t)
    returning id`);
  return rows.length > 0;
}

/**
 * Brings back everything archived or trashed together with `id`. If its
 * parent is no longer active, it goes to the root level.
 */
export async function restoreItem(tx: UserTx, id: string) {
  await tx.execute(sql`
    update items set parent_id = null
    where id = ${id} and status_root_id = ${id} and parent_id is not null
      and not exists (
        select 1 from items p where p.id = items.parent_id and p.status = 'active'
      )`);
  const rows = await tx.execute(sql`
    update items set status = 'active', status_root_id = null, status_changed_at = null
    where status_root_id = ${id}
    returning id`);
  return rows.length > 0;
}

/** Permanently deletes a trashed item and everything inside it (FK cascade). */
export async function deleteForever(tx: UserTx, id: string) {
  const rows = await tx
    .delete(items)
    .where(and(eq(items.id, id), eq(items.status, "trashed"), eq(items.statusRootId, id)))
    .returning({ id: items.id });
  return rows.length > 0;
}
