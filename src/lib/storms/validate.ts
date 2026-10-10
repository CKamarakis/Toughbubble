import { changesBytes, type ChangeSet } from "./changeset";
import { BOARD_LIMIT, MAX_CHANGESET_BYTES, MAX_ENTRIES, MAX_TEXT } from "./limits";
import type { Item, StormBody } from "./model";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERROR = "That change was not valid.";
const MAX_Z = 64;

const REQUIRED = ["id", "type", "x", "y", "z", "w", "h", "text"] as const;
const ALLOWED = new Set<string>([...REQUIRED, "parentId", "rotation"]);

const isId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function parseItem(raw: unknown): Item | null {
  if (!isPlainObject(raw)) return null;
  const keys = Object.keys(raw);
  if (!keys.every((k) => ALLOWED.has(k))) return null;
  if (!REQUIRED.every((k) => keys.includes(k))) return null;
  const { id, type, x, y, z, w, h, text, parentId, rotation } = raw;
  if (!isId(id) || type !== "sticky") return null;
  if (!isNum(x) || !isNum(y) || !isNum(w) || !isNum(h)) return null;
  if (Math.abs(x) > BOARD_LIMIT || Math.abs(y) > BOARD_LIMIT) return null;
  if (w <= 0 || h <= 0 || w > BOARD_LIMIT || h > BOARD_LIMIT) return null;
  if (typeof z !== "string" || z.length === 0 || z.length > MAX_Z) return null;
  if (typeof text !== "string" || text.length > MAX_TEXT) return null;
  const item: Item = { id, type, x, y, z, w, h, text };
  if (keys.includes("parentId")) {
    if (!isId(parentId)) return null;
    item.parentId = parentId;
  }
  if (keys.includes("rotation")) {
    if (!isNum(rotation)) return null;
    item.rotation = rotation;
  }
  return item;
}

export function validateChangeSet(input: unknown): { ok: true; changes: ChangeSet } | { ok: false; error: string } {
  const fail = { ok: false, error: ERROR } as const;
  if (!isPlainObject(input)) return fail;
  const keys = Object.keys(input);
  if (keys.length !== 2 || !keys.includes("upsert") || !keys.includes("delete")) return fail;
  const { upsert, delete: del } = input;
  if (!Array.isArray(upsert) || !Array.isArray(del)) return fail;
  if (upsert.length > MAX_ENTRIES || del.length > MAX_ENTRIES) return fail;

  const deleteIds = new Set<string>();
  for (const id of del) {
    if (!isId(id) || deleteIds.has(id)) return fail;
    deleteIds.add(id);
  }
  const upsertIds = new Set<string>();
  const items: Item[] = [];
  for (const raw of upsert) {
    const item = parseItem(raw);
    if (!item || upsertIds.has(item.id) || deleteIds.has(item.id)) return fail;
    upsertIds.add(item.id);
    items.push(item);
  }

  const changes: ChangeSet = { upsert: items, delete: [...deleteIds] };
  if (changesBytes(changes) > MAX_CHANGESET_BYTES) return fail;
  return { ok: true, changes };
}

export function isStormBody(v: unknown): v is StormBody {
  return isPlainObject(v) && v.schema === 1 && isPlainObject(v.items);
}
