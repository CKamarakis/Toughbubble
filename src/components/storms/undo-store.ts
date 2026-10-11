import type { SaveStormActionResult } from "@/lib/storms/actions";
import type { History } from "@/lib/storms/history";

/**
 * Undo history that survives a reload (storms-canvas D7): kept in IndexedDB per
 * user and storm, written after quiet saves, used only if the stored version
 * still matches. Every call resolves quietly when IndexedDB is unavailable.
 */

const DB_NAME = "storms-undo";
const STORE = "history";

type Entry = { version: number; history: History };

/** History is written only after a save lands with nothing left pending. */
export const shouldPersist = (quiet: boolean, result: SaveStormActionResult) =>
  quiet && result.status === "saved";

export const undoKey = (userId: string, stormId: string) =>
  `${userId}:${stormId}`;

export const versionMatches = (
  entry: { version?: unknown } | undefined,
  version: number,
) => entry?.version === version;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined")
      return reject(new Error("no indexedDB"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("blocked"));
  });
}

/** Runs one request in a transaction, closes the connection, and resolves its result. */
async function run<T>(
  mode: IDBTransactionMode,
  make: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = make(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function saveUndo(
  userId: string,
  stormId: string,
  version: number,
  history: History,
): Promise<void> {
  try {
    const entry: Entry = { version, history };
    await run("readwrite", (s) => s.put(entry, undoKey(userId, stormId)));
  } catch {
    // Private mode, quota or a blocked database: undo just won't survive a reload.
  }
}

export async function loadUndo(
  userId: string,
  stormId: string,
  version: number,
): Promise<History | null> {
  try {
    const key = undoKey(userId, stormId);
    const entry = await run<Entry | undefined>("readonly", (s) => s.get(key));
    if (versionMatches(entry, version) && entry) return entry.history;
    if (entry) await run("readwrite", (s) => s.delete(key));
    return null;
  } catch {
    return null;
  }
}

export async function clearUndo(): Promise<void> {
  try {
    await run("readwrite", (s) => s.clear());
  } catch {
    // Nothing to clear, or IndexedDB is unavailable.
  }
}

/** Resolves with the promise's value, or `fallback` after `ms`. */
export function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      () => (clearTimeout(t), resolve(fallback)),
    );
  });
}
