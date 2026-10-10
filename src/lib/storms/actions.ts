"use server";

import { revalidatePath } from "next/cache";
import { UnauthenticatedError, withUserDb } from "@/db/client";
import { NOT_FOUND, treeErrorMessage } from "@/lib/tree/errors";
import type { ActionResult } from "@/lib/tree/actions";
import * as ops from "./operations";
import { validateChangeSet } from "./validate";

// Storm board actions. Like note bodies, they don't revalidate the layout; the
// client patches the Storm's "last edited" time itself.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export type SaveStormActionResult = ops.SaveStormResult | { status: "error"; error: string };

function errorResult(error: unknown): { status: "error"; error: string } {
  if (error instanceof UnauthenticatedError) {
    return { status: "error", error: "Your session has ended. Sign in again to keep saving." };
  }
  console.error("[storms] unexpected error", { message: (error as Error)?.message });
  return { status: "error", error: "Couldn't save. Retrying…" };
}

export async function saveStorm(id: string, changes: unknown, baseVersion: number): Promise<SaveStormActionResult> {
  if (!isId(id) || !Number.isInteger(baseVersion) || baseVersion < 0) {
    return { status: "error", error: "That request was not valid." };
  }
  const valid = validateChangeSet(changes);
  if (!valid.ok) return { status: "error", error: valid.error };
  try {
    return await withUserDb((tx) => ops.saveStormChanges(tx, id, valid.changes, baseVersion));
  } catch (error) {
    return errorResult(error);
  }
}

/** Copies a Storm; the sidebar order changes, so the layout is revalidated. */
export async function duplicateStorm(id: string): Promise<ActionResult<string>> {
  if (!isId(id)) return { ok: false, error: "That request was not valid." };
  try {
    const copyId = await withUserDb((tx) => ops.duplicateStorm(tx, id));
    if (!copyId) return { ok: false, error: NOT_FOUND };
    revalidatePath("/", "layout");
    return { ok: true, value: copyId };
  } catch (error) {
    return { ok: false, error: treeErrorMessage(error) };
  }
}

export async function loadStorm(id: string): Promise<ops.StormBoard | null> {
  if (!isId(id)) return null;
  return withUserDb((tx) => ops.getStormBody(tx, id));
}

export async function stormVersion(id: string): Promise<number | null> {
  if (!isId(id)) return null;
  return withUserDb((tx) => ops.getStormVersion(tx, id));
}
