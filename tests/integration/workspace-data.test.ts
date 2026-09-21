import { asc, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { itemContent, items } from "@/db/schema";
import type { UserTx } from "@/db/rls";
import { createTestUser, deleteTestUser, runAnonymous, withAdminDb, type TestUser } from "./harness";

let alice: TestUser;
let bob: TestUser;

beforeAll(async () => {
  [alice, bob] = await Promise.all([createTestUser(), createTestUser()]);
});

afterAll(async () => {
  await Promise.all([alice, bob].filter(Boolean).map(deleteTestUser));
});

let seq = 0;
const nextPosition = () => `a${(seq++).toString(36).padStart(4, "0")}`;

function createItem(tx: UserTx, values: Partial<typeof items.$inferInsert> = {}) {
  return tx
    .insert(items)
    .values({ kind: "note", position: nextPosition(), ...values })
    .returning()
    .then((rows) => rows[0]);
}

describe("session identity", () => {
  it("auth.uid() inside a user transaction is that user's id", async () => {
    const rows = await alice.run((tx) => tx.execute<{ uid: string }>(sql`select auth.uid() as uid`));
    expect(rows[0].uid).toBe(alice.id);
  });
});

describe("data ownership", () => {
  it("assigns the signed-in user as owner by default", async () => {
    const item = await alice.run((tx) => createItem(tx));
    expect(item.ownerId).toBe(alice.id);
  });

  it("rejects creating an item owned by someone else", async () => {
    await expect(alice.run((tx) => createItem(tx, { ownerId: bob.id }))).rejects.toThrow();
  });

  it("rejects creating content owned by someone else", async () => {
    const note = await alice.run((tx) => createItem(tx));
    await expect(
      alice.run((tx) => tx.insert(itemContent).values({ itemId: note.id, ownerId: bob.id, body: {} })),
    ).rejects.toThrow();
  });
});

describe("data isolation", () => {
  let aliceNote: typeof items.$inferSelect;

  beforeAll(async () => {
    aliceNote = await alice.run(async (tx) => {
      const note = await createItem(tx, { title: "private" });
      await tx.insert(itemContent).values({ itemId: note.id, body: { text: "secret" } });
      return note;
    });
  });

  it("hides another user's item by id", async () => {
    const rows = await bob.run((tx) => tx.select().from(items).where(eq(items.id, aliceNote.id)));
    expect(rows).toEqual([]);
  });

  it("hides another user's content", async () => {
    const rows = await bob.run((tx) =>
      tx.select().from(itemContent).where(eq(itemContent.itemId, aliceNote.id)),
    );
    expect(rows).toEqual([]);
  });

  it("returns only the user's own rows from an unfiltered list", async () => {
    await bob.run((tx) => createItem(tx));
    const aliceRows = await alice.run((tx) => tx.select().from(items));
    const bobRows = await bob.run((tx) => tx.select().from(items));
    expect(aliceRows.length).toBeGreaterThan(0);
    expect(aliceRows.every((r) => r.ownerId === alice.id)).toBe(true);
    expect(bobRows.every((r) => r.ownerId === bob.id)).toBe(true);
  });

  it("cannot update or delete another user's item or content", async () => {
    const changed = await bob.run(async (tx) => [
      ...(await tx.update(items).set({ title: "hijacked" }).where(eq(items.id, aliceNote.id)).returning()),
      ...(await tx.delete(items).where(eq(items.id, aliceNote.id)).returning()),
      ...(await tx
        .update(itemContent)
        .set({ body: { text: "hijacked" } })
        .where(eq(itemContent.itemId, aliceNote.id))
        .returning()),
      ...(await tx.delete(itemContent).where(eq(itemContent.itemId, aliceNote.id)).returning()),
    ]);
    expect(changed).toEqual([]);

    const [item] = await alice.run((tx) => tx.select().from(items).where(eq(items.id, aliceNote.id)));
    const [content] = await alice.run((tx) =>
      tx.select().from(itemContent).where(eq(itemContent.itemId, aliceNote.id)),
    );
    expect(item.title).toBe("private");
    expect(content.body).toEqual({ text: "secret" });
  });

  it("cannot move own item to another user", async () => {
    const bobItem = await bob.run((tx) => createItem(tx));
    await expect(
      bob.run((tx) => tx.update(items).set({ ownerId: alice.id }).where(eq(items.id, bobItem.id))),
    ).rejects.toThrow();
  });

  it("returns nothing and changes nothing without a session", async () => {
    expect(await runAnonymous((tx) => tx.select().from(items))).toEqual([]);
    expect(await runAnonymous((tx) => tx.select().from(itemContent))).toEqual([]);
    await expect(runAnonymous((tx) => createItem(tx, { ownerId: alice.id }))).rejects.toThrow();
    const deleted = await runAnonymous((tx) => tx.delete(items).returning()).catch(() => []);
    expect(deleted).toEqual([]);
  });
});

describe("item kinds and statuses", () => {
  it("starts new items as active", async () => {
    const item = await alice.run((tx) => createItem(tx, { kind: "folder" }));
    expect(item.status).toBe("active");
  });

  it("rejects an unknown kind", async () => {
    await expect(
      alice.run((tx) => tx.execute(sql`insert into items (kind, position) values ('bogus', 'z0')`)),
    ).rejects.toThrow();
  });

  it("rejects an unknown status", async () => {
    const item = await alice.run((tx) => createItem(tx));
    await expect(
      alice.run((tx) => tx.execute(sql`update items set status = 'deleted' where id = ${item.id}`)),
    ).rejects.toThrow();
  });
});

describe("parent and content integrity", () => {
  it("stores an item without a parent as root-level", async () => {
    const item = await alice.run((tx) => createItem(tx, { kind: "project" }));
    expect(item.parentId).toBeNull();
  });

  it("accepts a parent owned by the same user", async () => {
    const child = await alice.run(async (tx) => {
      const folder = await createItem(tx, { kind: "folder" });
      return createItem(tx, { parentId: folder.id });
    });
    expect(child.parentId).not.toBeNull();
  });

  it("rejects a parent owned by another user", async () => {
    const aliceFolder = await alice.run((tx) => createItem(tx, { kind: "folder" }));
    await expect(bob.run((tx) => createItem(tx, { parentId: aliceFolder.id }))).rejects.toThrow();
  });

  it("rejects content for another user's item", async () => {
    const aliceNote = await alice.run((tx) => createItem(tx));
    await expect(
      bob.run((tx) => tx.insert(itemContent).values({ itemId: aliceNote.id, body: {} })),
    ).rejects.toThrow();
  });

  it("rejects a second content record for the same item", async () => {
    const note = await alice.run((tx) => createItem(tx));
    await alice.run((tx) => tx.insert(itemContent).values({ itemId: note.id, body: {} }));
    await expect(
      alice.run((tx) => tx.insert(itemContent).values({ itemId: note.id, body: {} })),
    ).rejects.toThrow();
  });

  it("starts content at version 1", async () => {
    const content = await alice.run(async (tx) => {
      const note = await createItem(tx);
      const [row] = await tx.insert(itemContent).values({ itemId: note.id, body: {} }).returning();
      return row;
    });
    expect(content.version).toBe(1);
  });

  it("updates updated_at on every write", async () => {
    const before = await alice.run((tx) => createItem(tx));
    await new Promise((r) => setTimeout(r, 20));
    const [after] = await alice.run((tx) =>
      tx.update(items).set({ title: "renamed" }).where(eq(items.id, before.id)).returning(),
    );
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
  });
});

describe("cascades and ordering", () => {
  it("permanently deleting a folder removes its descendants and their content", async () => {
    const { folder, note } = await alice.run(async (tx) => {
      const folder = await createItem(tx, { kind: "folder" });
      const sub = await createItem(tx, { kind: "folder", parentId: folder.id });
      const note = await createItem(tx, { parentId: sub.id });
      await tx.insert(itemContent).values({ itemId: note.id, body: { text: "x" } });
      return { folder, note };
    });

    await alice.run((tx) => tx.delete(items).where(eq(items.id, folder.id)));

    const [remainingNote, remainingContent] = await alice.run(async (tx) => [
      await tx.select().from(items).where(eq(items.id, note.id)),
      await tx.select().from(itemContent).where(eq(itemContent.itemId, note.id)),
    ]);
    expect(remainingNote).toEqual([]);
    expect(remainingContent).toEqual([]);
  });

  it("deleting an account removes all of that user's items and content", async () => {
    const carol = await createTestUser();
    await carol.run(async (tx) => {
      const note = await createItem(tx);
      await tx.insert(itemContent).values({ itemId: note.id, body: {} });
    });

    await deleteTestUser(carol);

    const remaining = await withAdminDb(async (db) => [
      ...(await db.select().from(items).where(eq(items.ownerId, carol.id))),
      ...(await db.select().from(itemContent).where(eq(itemContent.ownerId, carol.id))),
    ]);
    expect(remaining).toEqual([]);
  });

  it("orders positions by byte value, not locale", async () => {
    const parent = await alice.run((tx) => createItem(tx, { kind: "folder" }));
    await alice.run(async (tx) => {
      for (const position of ["a", "Z", "B"]) await createItem(tx, { parentId: parent.id, position });
    });
    const rows = await alice.run((tx) =>
      tx.select({ position: items.position }).from(items).where(eq(items.parentId, parent.id)).orderBy(asc(items.position)),
    );
    // Locale collations would give a, B, Z.
    expect(rows.map((r) => r.position)).toEqual(["B", "Z", "a"]);
  });
});
