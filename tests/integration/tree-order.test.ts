import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { items } from "@/db/schema";
import type { UserTx } from "@/db/rls";
import * as ops from "@/lib/tree/operations";
import { sidebarCompare } from "@/lib/tree/order";
import { createTestUser, deleteTestUser, type TestUser } from "./harness";

// Manual order within kind groups (sidebar-manual-order D2, D3).

let user: TestUser;
let other: TestUser;

beforeAll(async () => {
  [user, other] = await Promise.all([createTestUser(), createTestUser()]);
});

afterAll(async () => {
  await Promise.all([user, other].filter(Boolean).map(deleteTestUser));
});

const pause = () => new Promise((r) => setTimeout(r, 15));

/** Ids of a parent's active notes and Storms in sidebar order. */
const noteOrder = (u: TestUser, parentId: string | null) =>
  u.run(async (tx) =>
    (await ops.loadActiveTree(tx))
      .filter((r) => r.parentId === parentId && (r.kind === "note" || r.kind === "storm"))
      .sort(sidebarCompare)
      .map((r) => r.id),
  );

/** A folder with notes created A, B, C (so newest first shows C, B, A). */
async function folderWithNotes(u: TestUser) {
  const folder = await u.run((tx) => ops.createItem(tx, "folder", null));
  const ids: string[] = [];
  for (let i = 0; i < 3; i++) {
    ids.push(await u.run((tx) => ops.createItem(tx, "note", folder)));
    await pause(); // distinct created_at
  }
  const [a, b, c] = ids;
  return { folder, a, b, c };
}

const editedAt = (tx: UserTx, id: string) =>
  tx
    .select({ editedAt: items.editedAt })
    .from(items)
    .where(eq(items.id, id))
    .then((r) => r[0].editedAt.getTime());

describe("reordering a group", () => {
  it("saves the new order and leaves edited_at alone", async () => {
    const { folder, a, b, c } = await folderWithNotes(user);
    expect(await noteOrder(user, folder)).toEqual([c, b, a]);
    const before = await user.run((tx) => editedAt(tx, a));
    expect(await user.run((tx) => ops.reorderGroup(tx, folder, 2, [a, c, b]))).toBe(true);
    expect(await noteOrder(user, folder)).toEqual([a, c, b]);
    expect(await user.run((tx) => editedAt(tx, a))).toBe(before);
  });

  it("refuses a list that isn't exactly the group, and changes nothing", async () => {
    const { folder, a, b, c } = await folderWithNotes(user);
    const sub = await user.run((tx) => ops.createItem(tx, "folder", folder));
    const elsewhere = await user.run((tx) => ops.createItem(tx, "note", null));
    for (const list of [
      [a, b], // missing one
      [a, b, c, c], // duplicate
      [a, b, c, elsewhere], // another parent
      [a, b, c, sub], // another group
    ]) {
      expect(await user.run((tx) => ops.reorderGroup(tx, folder, 2, list))).toBe(false);
    }
    expect(await noteOrder(user, folder)).toEqual([c, b, a]);
  });

  it("reorders top-level groups too", async () => {
    const fresh = await createTestUser();
    try {
      const x = await fresh.run((tx) => ops.createItem(tx, "note", null));
      await pause();
      const y = await fresh.run((tx) => ops.createItem(tx, "note", null));
      expect(await noteOrder(fresh, null)).toEqual([y, x]);
      expect(await fresh.run((tx) => ops.reorderGroup(tx, null, 2, [x, y]))).toBe(true);
      expect(await noteOrder(fresh, null)).toEqual([x, y]);
    } finally {
      await deleteTestUser(fresh);
    }
  });

  it("cannot reorder another user's items", async () => {
    const { folder, a, b, c } = await folderWithNotes(user);
    expect(await other.run((tx) => ops.reorderGroup(tx, folder, 2, [a, b, c]))).toBe(false);
    expect(await noteOrder(user, folder)).toEqual([c, b, a]);
  });
});

describe("new and moved items go first", () => {
  it("puts a new note first in an untouched group", async () => {
    const { folder, a, b, c } = await folderWithNotes(user);
    const d = await user.run((tx) => ops.createItem(tx, "note", folder));
    expect(await noteOrder(user, folder)).toEqual([d, c, b, a]);
  });

  it("puts a new note first after a reorder", async () => {
    const { folder, a, b, c } = await folderWithNotes(user);
    await user.run((tx) => ops.reorderGroup(tx, folder, 2, [c, a, b]));
    const d = await user.run((tx) => ops.createItem(tx, "note", folder));
    expect(await noteOrder(user, folder)).toEqual([d, c, a, b]);
  });

  it("puts a moved-in note first, even if it is the oldest", async () => {
    const outside = await user.run((tx) => ops.createItem(tx, "note", null));
    await pause();
    const { folder, a, b, c } = await folderWithNotes(user);
    await user.run((tx) => ops.reorderGroup(tx, folder, 2, [a, b, c]));
    expect(await user.run((tx) => ops.moveItem(tx, outside, folder))).toBe(true);
    expect(await noteOrder(user, folder)).toEqual([outside, a, b, c]);
  });

  it("puts a moved-in note first in an untouched group", async () => {
    const outside = await user.run((tx) => ops.createItem(tx, "note", null));
    await pause();
    const { folder, a, b, c } = await folderWithNotes(user);
    await user.run((tx) => ops.moveItem(tx, outside, folder));
    expect(await noteOrder(user, folder)).toEqual([outside, c, b, a]);
  });
});
