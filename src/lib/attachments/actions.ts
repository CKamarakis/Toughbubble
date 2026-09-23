"use server";

import { UnauthenticatedError, withUserDb } from "@/db/client";
import { createClient } from "@/lib/supabase/server";
import * as ops from "./operations";

// Attachment actions (attachments design D3–D5). Files never pass through
// here (Server Actions accept 1 MB); the browser uploads straight to Storage.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

type Failure = { status: "error"; error: string };

function failure(error: unknown, fallback: string): Failure {
  if (error instanceof UnauthenticatedError) {
    return { status: "error", error: "Your session has ended. Sign in again to attach files." };
  }
  console.error("[attachments] unexpected error", { message: (error as Error)?.message });
  return { status: "error", error: fallback };
}

const bucket = async () => (await createClient()).storage.from("attachments");

export async function startAttachment(itemId: string, meta: ops.AttachmentMeta): Promise<ops.StartResult | Failure> {
  if (!isId(itemId) || !meta || typeof meta !== "object") return { status: "error", error: "That request was not valid." };
  try {
    return await withUserDb((tx) => ops.startAttachment(tx, itemId, meta));
  } catch (error) {
    return failure(error, "Couldn't start the upload.");
  }
}

export async function finishAttachment(id: string): Promise<ops.FinishResult | Failure> {
  if (!isId(id)) return { status: "error", error: "That request was not valid." };
  try {
    const storage = await bucket();
    return await withUserDb((tx) => ops.finishAttachment(tx, storage, id));
  } catch (error) {
    return failure(error, "Couldn't finish the upload.");
  }
}

export async function getAttachmentLinks(itemId: string, ids: string[]): Promise<Record<string, string>> {
  if (!isId(itemId) || !Array.isArray(ids) || ids.length > 500 || !ids.every(isId)) return {};
  try {
    const storage = await bucket();
    return await withUserDb((tx) => ops.getAttachmentLinks(tx, storage, itemId, ids));
  } catch (error) {
    failure(error, "");
    return {};
  }
}

export async function getDownloadLink(id: string): Promise<string | null> {
  if (!isId(id)) return null;
  try {
    const storage = await bucket();
    return await withUserDb((tx) => ops.getDownloadLink(tx, storage, id));
  } catch (error) {
    failure(error, "");
    return null;
  }
}

export async function copyAttachments(itemId: string, ids: string[]): Promise<Record<string, string> | null> {
  if (!isId(itemId) || !Array.isArray(ids) || ids.length > 100 || !ids.every(isId)) return null;
  try {
    const storage = await bucket();
    return await withUserDb((tx) => ops.copyAttachments(tx, storage, itemId, ids));
  } catch (error) {
    failure(error, "");
    return null;
  }
}
