import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { itemContent, items } from "@/db/schema";
import * as notes from "@/lib/notes/operations";
import * as storms from "@/lib/storms/operations";
import { EMPTY_BOARD, type Sticky } from "@/lib/storms/model";
import { MAX_BODY_BYTES, MAX_TEXT } from "@/lib/storms/limits";
import type { ChangeSet } from "@/lib/storms/changeset";
import * as tree from "@/lib/tree/operations";
import { sidebarCompare } from "@/lib/tree/order";
import { createTestUser, deleteTestUser, type TestUser } from "./harness";

let user: TestUser;
let other: TestUser;

beforeAll(async () => {
  [user, other] = await Promise.all([createTestUser(), createTestUser()]);
});

afterAll(async () => {
  await Promise.all([user, other].filter(Boolean).map(deleteTestUser));
});

const sticky = (over: Partial<Sticky> = {}): Sticky => ({
  id: randomUUID(),
  type: "sticky",
  x: 10,
  y: 20,
  z: "a0",
  w: 200,
  h: 200,
  text: "hello",
  ...over,
});
const upsert = (...items: Sticky[]): ChangeSet => ({ upsert: items, delete: [] });
const newStorm = () => user.run((tx) => tree.createItem(tx, "storm", null));
const save = (id: string, cs: ChangeSet, base: number, as: TestUser = user) =>
  as.run((tx) => storms.saveStormChanges(tx, id, cs, base));
const load = (id: string, as: TestUser = user) => as.run((tx) => storms.getStormBody(tx, id));
const bodyBytes = (id: string) =>
  user.run(async (tx) => {
    const [row] = await tx
      .select({ n: sql<number>`octet_length(${itemContent.body}::text)` })
      .from(itemContent)
      .where(eq(itemContent.itemId, id));
    return row?.n ?? null;
  });
const rowCount = (id: string) =>
  user.run((tx) => tx.select({ id: itemContent.itemId }).from(itemContent).where(eq(itemContent.itemId, id)).then((r) => r.length));
const big = (n: number) => Array.from({ length: n }, () => sticky({ text: "x".repeat(MAX_TEXT) }));

describe("storm board saves", () => {
  it("unsaved storm reads as EMPTY_BOARD at version 0", async () => {
    const id = await newStorm();
    expect(await load(id)).toEqual({ body: EMPTY_BOARD, version: 0 });
    expect(await user.run((tx) => storms.getStormVersion(tx, id))).toBe(0);
  });

  it("first save stores version 1 and reads back the sticky", async () => {
    const id = await newStorm();
    const s = sticky();
    expect(await save(id, upsert(s), 0)).toMatchObject({ status: "saved", version: 1 });
    expect(await load(id)).toEqual({ body: { schema: 1, items: { [s.id]: s } }, version: 1 });
  });

  it("a move saves only that sticky and keeps the others", async () => {
    const id = await newStorm();
    const a = sticky();
    const b = sticky({ text: "other" });
    await save(id, upsert(a, b), 0);
    const moved = { ...a, x: 500, y: -40 };
    expect(await save(id, upsert(moved), 1)).toMatchObject({ status: "saved", version: 2 });
    expect(await load(id)).toEqual({ body: { schema: 1, items: { [a.id]: moved, [b.id]: b } }, version: 2 });
  });

  it("applies deletes, and a delete of an unknown id is harmless", async () => {
    const id = await newStorm();
    const a = sticky();
    const b = sticky();
    await save(id, upsert(a, b), 0);
    expect(await save(id, { upsert: [], delete: [a.id, randomUUID()] }, 1)).toMatchObject({ status: "saved", version: 2 });
    expect((await load(id))?.body.items).toEqual({ [b.id]: b });
  });

  it("stale base version → conflict with storedVersion", async () => {
    const id = await newStorm();
    await save(id, upsert(sticky()), 0);
    await save(id, upsert(sticky()), 1);
    const before = await load(id);
    expect(await save(id, upsert(sticky()), 1)).toEqual({ status: "conflict", storedVersion: 2 });
    expect(await save(id, upsert(sticky()), 0)).toEqual({ status: "conflict", storedVersion: 2 });
    expect(await load(id)).toEqual(before);
  });

  it("keep-mine upsert re-adds a sticky deleted elsewhere", async () => {
    const id = await newStorm();
    const a = sticky();
    await save(id, upsert(a), 0);
    await save(id, { upsert: [], delete: [a.id] }, 1); // other tab deletes it
    expect((await load(id))?.body.items).toEqual({});
    expect(await save(id, upsert({ ...a, x: 99 }), 2)).toMatchObject({ status: "saved", version: 3 });
    expect((await load(id))?.body.items[a.id]).toEqual({ ...a, x: 99 });
  });

  it("too large → too-large, stored body and version unchanged", async () => {
    const id = await newStorm();
    let version = 0;
    for (const n of [120, 120, 120]) {
      const r = await save(id, upsert(...big(n)), version);
      expect(r.status).toBe("saved");
      version = r.status === "saved" ? r.version : -1;
    }
    const seeded = await bodyBytes(id);
    expect(seeded).toBeGreaterThan(MAX_BODY_BYTES * 0.8);
    expect(seeded).toBeLessThanOrEqual(MAX_BODY_BYTES);
    const before = await load(id);
    expect(await save(id, upsert(...big(100)), version)).toEqual({ status: "too-large" });
    expect(await load(id)).toEqual(before);
    expect(await bodyBytes(id)).toBe(seeded);
  }, 120_000);

  it("first save too large → too-large, no row", async () => {
    const id = await newStorm();
    // 450 max-text stickies exceed the cap in one go (the change-set cap is the action's job).
    expect(await save(id, upsert(...big(450)), 0)).toEqual({ status: "too-large" });
    expect(await rowCount(id)).toBe(0);
    expect(await load(id)).toEqual({ body: EMPTY_BOARD, version: 0 });
  }, 60_000);

  it("another user's storm → not-found", async () => {
    const id = await newStorm();
    const s = sticky();
    await save(id, upsert(s), 0);
    expect(await save(id, upsert(sticky()), 1, other)).toEqual({ status: "not-found" });
    expect(await load(id, other)).toBeNull();
    expect(await other.run((tx) => storms.getStormVersion(tx, id))).toBeNull();
    expect(await load(id)).toMatchObject({ version: 1 });
  });

  it("a note's id → not-found and the note body unchanged", async () => {
    const id = await user.run((tx) => tree.createItem(tx, "note", null));
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "mine" }] }] };
    await user.run((tx) => notes.saveNoteBody(tx, id, doc, 0));
    expect(await save(id, upsert(sticky()), 1)).toEqual({ status: "not-found" });
    expect(await save(id, upsert(sticky()), 0)).toEqual({ status: "not-found" });
    expect(await load(id)).toBeNull();
    expect(await user.run((tx) => notes.getNoteBody(tx, id))).toEqual({ body: doc, version: 1 });
  });

  it("archived storm → not-found", async () => {
    const id = await newStorm();
    await save(id, upsert(sticky()), 0);
    await user.run((tx) => tree.archiveItem(tx, id));
    expect(await save(id, upsert(sticky()), 1)).toEqual({ status: "not-found" });
    expect(await load(id)).toBeNull();
    expect(await user.run((tx) => storms.isActiveStorm(tx, id))).toBe(false);
  });

  it("a stored body that is not a board loads as an empty board, keeping its version", async () => {
    const id = await newStorm();
    await save(id, upsert(sticky()), 0);
    await user.run((tx) => tx.update(itemContent).set({ body: { nope: true } }).where(eq(itemContent.itemId, id)));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await load(id)).toEqual({ body: EMPTY_BOARD, version: 1 });
      expect(log).toHaveBeenCalledTimes(1);
    } finally {
      log.mockRestore();
    }
  });
});

describe("duplicate a storm", () => {
  const duplicate = (id: string, as: TestUser = user) => as.run((tx) => storms.duplicateStorm(tx, id));
  const rename = (id: string, title: string) => user.run((tx) => tree.renameItem(tx, id, title));
  const titleOf = (id: string) =>
    user.run(async (tx) => (await tx.select({ title: items.title }).from(items).where(eq(items.id, id)))[0]?.title);
  const siblingOrder = (parentId: string | null) =>
    user.run(async (tx) => {
      const rows = await tx
        .select({
          id: items.id,
          kind: items.kind,
          title: items.title,
          position: items.position,
          createdAt: items.createdAt,
          editedAt: items.editedAt,
          parentId: items.parentId,
        })
        .from(items)
        .where(eq(items.status, "active"));
      return rows
        .filter((r) => r.parentId === parentId)
        .map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), editedAt: r.editedAt.toISOString() }))
        .sort(sidebarCompare)
        .map((r) => r.id);
    });

  it("copies three stickies and returns a new id", async () => {
    const id = await newStorm();
    const stickies = [sticky(), sticky({ text: "two" }), sticky({ text: "three" })];
    await save(id, upsert(...stickies), 0);
    const copy = await duplicate(id);
    expect(copy).toEqual(expect.any(String));
    expect(copy).not.toBe(id);
    expect(await load(copy!)).toEqual({
      body: { schema: 1, items: Object.fromEntries(stickies.map((s) => [s.id, s])) },
      version: 1,
    });
  });

  it("copy is listed directly below the original in a never-reordered group", async () => {
    const a = await newStorm();
    const id = await newStorm();
    const c = await newStorm();
    await rename(id, "Plan");
    const copy = (await duplicate(id))!;
    expect(await titleOf(copy)).toBe("Plan (copy)");
    const order = await siblingOrder(null);
    expect(order.indexOf(copy)).toBe(order.indexOf(id) + 1);
    // The others keep their relative order.
    expect(order.indexOf(c)).toBeLessThan(order.indexOf(a));
  });

  it('200-char title → copy title ends with " (copy)" and is 200 chars', async () => {
    const id = await newStorm();
    await rename(id, "x".repeat(200));
    const copy = (await duplicate(id))!;
    const title = await titleOf(copy);
    expect(title).toHaveLength(200);
    expect(title!.endsWith(" (copy)")).toBe(true);
  });

  it("untitled storm → copy is named after the untitled display name", async () => {
    const id = await newStorm();
    expect(await titleOf((await duplicate(id))!)).toBe("Untitled Storm (copy)");
  });

  it("unsaved storm → copy has no content row", async () => {
    const id = await newStorm();
    const copy = (await duplicate(id))!;
    expect(await rowCount(copy)).toBe(0);
    expect(await load(copy)).toEqual({ body: EMPTY_BOARD, version: 0 });
  });

  it("saving to the copy leaves the original unchanged", async () => {
    const id = await newStorm();
    const s = sticky();
    await save(id, upsert(s), 0);
    const copy = (await duplicate(id))!;
    await save(copy, upsert(sticky({ text: "only in copy" })), 1);
    expect(await load(id)).toEqual({ body: { schema: 1, items: { [s.id]: s } }, version: 1 });
  });

  it("a note's id → null", async () => {
    const id = await user.run((tx) => tree.createItem(tx, "note", null));
    expect(await duplicate(id)).toBeNull();
  });

  it("another user's storm → null", async () => {
    const id = await newStorm();
    expect(await duplicate(id, other)).toBeNull();
  });
});
