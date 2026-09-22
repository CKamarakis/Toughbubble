import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { items } from "@/db/schema";
import type { UserTx } from "@/db/rls";
import { createTestUser, deleteTestUser, type TestUser } from "./harness";

let user: TestUser;

beforeAll(async () => {
  user = await createTestUser();
});

afterAll(async () => {
  if (user) await deleteTestUser(user);
});

type Kind = "project" | "folder" | "note" | "storm";
const create = (tx: UserTx, kind: Kind, parentId: string | null = null) =>
  tx
    .insert(items)
    .values({ kind, parentId })
    .returning()
    .then((r) => r[0]);

/** Resolves to the violated constraint name, or "NO ERROR". */
async function violation(p: Promise<unknown>) {
  try {
    await p;
    return "NO ERROR";
  } catch (e) {
    const cause = (e as { cause?: { constraint_name?: string; code?: string } }).cause ?? e;
    const c = cause as { constraint_name?: string; code?: string };
    return c.constraint_name ?? `code ${c.code}`;
  }
}

describe("only containers have children", () => {
  it("rejects placing an item inside a note or a Storm", async () => {
    const { note, storm } = await user.run(async (tx) => ({
      note: await create(tx, "note"),
      storm: await create(tx, "storm"),
    }));
    expect(await violation(user.run((tx) => create(tx, "note", note.id)))).toBe(
      "items_parent_is_container",
    );
    expect(await violation(user.run((tx) => create(tx, "folder", storm.id)))).toBe(
      "items_parent_is_container",
    );
  });

  it("rejects moving an item into a note", async () => {
    const { note, other } = await user.run(async (tx) => ({
      note: await create(tx, "note"),
      other: await create(tx, "note"),
    }));
    expect(
      await violation(
        user.run((tx) => tx.update(items).set({ parentId: note.id }).where(eq(items.id, other.id))),
      ),
    ).toBe("items_parent_is_container");
  });

  it("rejects turning a folder with children into a note", async () => {
    const folder = await user.run(async (tx) => {
      const f = await create(tx, "folder");
      await create(tx, "note", f.id);
      return f;
    });
    expect(
      await violation(
        user.run((tx) => tx.update(items).set({ kind: "note" }).where(eq(items.id, folder.id))),
      ),
    ).toBe("items_parent_is_container");
  });

  it("allows converting a folder with children into a project and back", async () => {
    const folder = await user.run(async (tx) => {
      const f = await create(tx, "folder");
      await create(tx, "note", f.id);
      return f;
    });
    await user.run((tx) => tx.update(items).set({ kind: "project" }).where(eq(items.id, folder.id)));
    await user.run((tx) => tx.update(items).set({ kind: "folder" }).where(eq(items.id, folder.id)));
    const [row] = await user.run((tx) => tx.select().from(items).where(eq(items.id, folder.id)));
    expect(row.kind).toBe("folder");
  });
});

describe("no cycles", () => {
  it("rejects making an item its own parent", async () => {
    const folder = await user.run((tx) => create(tx, "folder"));
    expect(
      await violation(
        user.run((tx) => tx.update(items).set({ parentId: folder.id }).where(eq(items.id, folder.id))),
      ),
    ).toBe("items_no_cycles");
  });

  it("rejects moving a folder into its own descendant, leaving the tree unchanged", async () => {
    const { top, deep } = await user.run(async (tx) => {
      const top = await create(tx, "folder");
      const mid = await create(tx, "folder", top.id);
      const deep = await create(tx, "folder", mid.id);
      return { top, deep };
    });
    expect(
      await violation(
        user.run((tx) => tx.update(items).set({ parentId: deep.id }).where(eq(items.id, top.id))),
      ),
    ).toBe("items_no_cycles");
    const [row] = await user.run((tx) => tx.select().from(items).where(eq(items.id, top.id)));
    expect(row.parentId).toBeNull();
  });
});

describe("active items under active parents (checked at commit)", () => {
  const setStatus = (tx: UserTx, id: string, status: "active" | "archived" | "trashed") =>
    tx.update(items).set({ status }).where(eq(items.id, id));

  it("rejects creating an active note inside a trashed folder", async () => {
    const folder = await user.run(async (tx) => {
      const f = await create(tx, "folder");
      await setStatus(tx, f.id, "trashed");
      return f;
    });
    expect(await violation(user.run((tx) => create(tx, "note", folder.id)))).toBe(
      "items_active_parent",
    );
  });

  it("rejects moving an active note into an archived folder", async () => {
    const { folder, note } = await user.run(async (tx) => {
      const folder = await create(tx, "folder");
      await setStatus(tx, folder.id, "archived");
      return { folder, note: await create(tx, "note") };
    });
    expect(
      await violation(
        user.run((tx) => tx.update(items).set({ parentId: folder.id }).where(eq(items.id, note.id))),
      ),
    ).toBe("items_active_parent");
  });

  it("rejects archiving a folder while leaving its children active", async () => {
    const folder = await user.run(async (tx) => {
      const f = await create(tx, "folder");
      await create(tx, "note", f.id);
      return f;
    });
    expect(await violation(user.run((tx) => setStatus(tx, folder.id, "archived")))).toBe(
      "items_active_parent",
    );
  });

  it("accepts a whole subtree changing status in one statement", async () => {
    const folder = await user.run(async (tx) => {
      const f = await create(tx, "folder");
      await create(tx, "note", f.id);
      return f;
    });
    const subtree = sql`
      with recursive t as (
        select id from items where id = ${folder.id}
        union all
        select i.id from items i join t on i.parent_id = t.id
      )`;
    await user.run((tx) =>
      tx.execute(sql`${subtree} update items set status = 'trashed' where id in (select id from t)`),
    );
    await user.run((tx) =>
      tx.execute(sql`${subtree} update items set status = 'active' where id in (select id from t)`),
    );
    const rows = await user.run((tx) =>
      tx.select({ status: items.status }).from(items).where(eq(items.parentId, folder.id)),
    );
    expect(rows.map((r) => r.status)).toEqual(["active"]);
  });

  it("allows a trashed item under an active parent", async () => {
    const note = await user.run(async (tx) => {
      const f = await create(tx, "folder");
      return create(tx, "note", f.id);
    });
    expect(await violation(user.run((tx) => setStatus(tx, note.id, "trashed")))).toBe("NO ERROR");
  });
});
