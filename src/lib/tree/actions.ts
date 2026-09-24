"use server";

import { revalidatePath } from "next/cache";
import { withUserDb, type UserTx } from "@/db/client";
import { attachmentPathsUnder, removeStoredFiles } from "@/lib/attachments/operations";
import { createClient } from "@/lib/supabase/server";
import { NOT_FOUND, treeErrorMessage } from "./errors";
import * as ops from "./operations";
import { isProjectColor, isProjectIcon } from "./style";
import type { KindGroup } from "./order";
import type { ItemKind } from "./types";

export type ActionResult<T = undefined> = { ok: true; value: T } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS: ItemKind[] = ["project", "folder", "note", "storm"];
const MAX_TITLE = 200;

/**
 * Runs a tree operation as the signed-in user. `changed` false means no
 * active item matched (missing, someone else's, or no longer active).
 */
async function run<T>(
  work: (tx: UserTx) => Promise<T>,
  changed: (value: T) => boolean = (v) => v !== false,
): Promise<ActionResult<T>> {
  try {
    const value = await withUserDb(work);
    if (!changed(value)) return { ok: false, error: NOT_FOUND };
    revalidatePath("/", "layout");
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: treeErrorMessage(error) };
  }
}

const invalid = (error = "That request was not valid."): ActionResult<never> => ({ ok: false, error });
const isId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const isParent = (v: unknown): v is string | null => v === null || isId(v);

const GROUPS = [0, 1, 2] as const;
const MAX_GROUP = 1000;

/** Saves a new order for one kind group under one parent (sidebar-manual-order D2). */
export async function reorderItems(parentId: string | null, group: KindGroup, orderedIds: string[]) {
  if (
    !isParent(parentId) ||
    !GROUPS.includes(group) ||
    !Array.isArray(orderedIds) ||
    orderedIds.length === 0 ||
    orderedIds.length > MAX_GROUP ||
    !orderedIds.every(isId)
  ) {
    return invalid();
  }
  const result = await run((tx) => ops.reorderGroup(tx, parentId, group, orderedIds));
  // "Not found" here means the group changed (an item added or removed elsewhere).
  return result.ok || result.error !== NOT_FOUND
    ? result
    : invalid("The list changed in the meantime. Reload and try again.");
}

export async function createItem(kind: ItemKind, parentId: string | null) {
  if (!KINDS.includes(kind) || !isParent(parentId)) return invalid();
  return run((tx) => ops.createItem(tx, kind, parentId));
}

export async function renameItem(id: string, title: string) {
  if (!isId(id) || typeof title !== "string") return invalid();
  const clean = title.replace(/\s+/g, " ").trim();
  if (clean.length > MAX_TITLE) return invalid(`Titles can be at most ${MAX_TITLE} characters.`);
  return run((tx) => ops.renameItem(tx, id, clean));
}

export async function setProjectStyle(id: string, icon: string | null, color: string | null) {
  if (!isId(id)) return invalid();
  if (icon !== null && !isProjectIcon(icon)) return invalid();
  if (color !== null && !isProjectColor(color)) return invalid();
  return run((tx) => ops.setProjectStyle(tx, id, { icon, color }));
}

export async function convertItem(id: string, to: "project" | "folder") {
  if (!isId(id) || (to !== "project" && to !== "folder")) return invalid();
  return run((tx) => ops.convertItem(tx, id, to));
}

export async function moveItem(id: string, parentId: string | null) {
  if (!isId(id) || !isParent(parentId) || id === parentId) return invalid();
  return run((tx) => ops.moveItem(tx, id, parentId));
}

export async function archiveItem(id: string) {
  if (!isId(id)) return invalid();
  return run((tx) => ops.archiveItem(tx, id));
}

export async function trashItem(id: string) {
  if (!isId(id)) return invalid();
  return run((tx) => ops.trashItem(tx, id));
}

export async function restoreItem(id: string) {
  if (!isId(id)) return invalid();
  return run((tx) => ops.restoreItem(tx, id));
}

export async function deleteForever(id: string) {
  if (!isId(id)) return invalid();
  // Attached files are removed through the Storage API once the rows are gone
  // (attachments design D8); a failure leaves them for the purge job.
  let files: string[] = [];
  const result = await run(async (tx) => {
    files = await attachmentPathsUnder(tx, id);
    return ops.deleteForever(tx, id);
  });
  if (result.ok && files.length > 0) {
    await removeStoredFiles((await createClient()).storage.from("attachments"), files);
  }
  return result;
}
