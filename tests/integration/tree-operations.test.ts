import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { items } from "@/db/schema";
import type { UserTx } from "@/db/rls";
import { treeErrorMessage } from "@/lib/tree/errors";
import * as ops from "@/lib/tree/operations";
import { createTestUser, deleteTestUser, type TestUser } from "./harness";

let user: TestUser;
let other: TestUser;

beforeAll(async () => {
  [user, other] = await Promise.all([createTestUser(), createTestUser()]);
});

afterAll(async () => {
  await Promise.all([user, other].filter(Boolean).map(deleteTestUser));
});

const get = (tx: UserTx, id: string) =>
  tx
    .select()
    .from(items)
    .where(eq(items.id, id))
    .then((r) => r[0]);

/** Builds folder F containing note N and subfolder S (with note SN). */
const makeTree = (u: TestUser) =>
  u.run(async (tx) => {
    const f = await ops.createItem(tx, "folder", null);
    const n = await ops.createItem(tx, "note", f);
    const s = await ops.createItem(tx, "folder", f);
    const sn = await ops.createItem(tx, "note", s);
    return { f, n, s, sn };
  });

const statuses = (u: TestUser, ids: string[]) =>
  u.run(async (tx) => Promise.all(ids.map(async (id) => (await get(tx, id))?.status ?? "gone")));

const pause = () => new Promise((r) => setTimeout(r, 25));

describe("create, rename, style, convert (3.1)", () => {
  it("creates active items with empty titles and appears in the active tree", async () => {
    const id = await user.run((tx) => ops.createItem(tx, "project", null));
    const row = await user.run((tx) => get(tx, id));
    expect(row).toMatchObject({ kind: "project", title: "", status: "active", parentId: null });
    const tree = await user.run((tx) => ops.loadActiveTree(tx));
    expect(tree.find((r) => r.id === id)).toMatchObject({ kind: "project", title: "" });
  });

  it("rename saves the title and moves edited_at forward", async () => {
    const id = await user.run((tx) => ops.createItem(tx, "note", null));
    const before = await user.run((tx) => get(tx, id));
    await pause();
    expect(await user.run((tx) => ops.renameItem(tx, id, "Plans"))).toBe(true);
    const after = await user.run((tx) => get(tx, id));
    expect(after.title).toBe("Plans");
    expect(after.editedAt.getTime()).toBeGreaterThan(before.editedAt.getTime());
  });

  it("sets project style only on projects", async () => {
    const { p, f } = await user.run(async (tx) => ({
      p: await ops.createItem(tx, "project", null),
      f: await ops.createItem(tx, "folder", null),
    }));
    const style = { icon: "rocket", color: "green" };
    expect(await user.run((tx) => ops.setProjectStyle(tx, p, style))).toBe(true);
    expect(await user.run((tx) => ops.setProjectStyle(tx, f, style))).toBe(false);
    expect(await user.run((tx) => get(tx, p))).toMatchObject(style);
  });

  it("converts folder to project and back, clearing style and keeping contents", async () => {
    const { f, n } = await makeTree(user);
    expect(await user.run((tx) => ops.convertItem(tx, f, "project"))).toBe(true);
    await user.run((tx) => ops.setProjectStyle(tx, f, { icon: "star", color: "blue" }));
    expect(await user.run((tx) => ops.convertItem(tx, f, "folder"))).toBe(true);
    const row = await user.run((tx) => get(tx, f));
    expect(row).toMatchObject({ kind: "folder", icon: null, color: null });
    expect((await user.run((tx) => get(tx, n))).parentId).toBe(f);
  });

  it("does not convert notes", async () => {
    const n = await user.run((tx) => ops.createItem(tx, "note", null));
    expect(await user.run((tx) => ops.convertItem(tx, n, "folder"))).toBe(false);
  });
});

describe("move (3.2)", () => {
  it("moves into a container and to the root, updating edited_at", async () => {
    const { f, sn } = await makeTree(user);
    const before = await user.run((tx) => get(tx, sn));
    await pause();
    expect(await user.run((tx) => ops.moveItem(tx, sn, f))).toBe(true);
    const moved = await user.run((tx) => get(tx, sn));
    expect(moved.parentId).toBe(f);
    expect(moved.editedAt.getTime()).toBeGreaterThan(before.editedAt.getTime());
    expect(await user.run((tx) => ops.moveItem(tx, sn, null))).toBe(true);
    expect((await user.run((tx) => get(tx, sn))).parentId).toBeNull();
  });

  it("maps each rejection to a user message", async () => {
    const { f, n, s } = await makeTree(user);
    const archived = await user.run((tx) => ops.createItem(tx, "folder", null));
    await user.run((tx) => ops.archiveItem(tx, archived));
    const message = (p: Promise<unknown>) => p.then(() => "NO ERROR", treeErrorMessage);

    expect(await message(user.run((tx) => ops.moveItem(tx, s, n)))).toBe(
      "Only projects and folders can contain items.",
    );
    expect(await message(user.run((tx) => ops.moveItem(tx, f, s)))).toBe(
      "An item can't be moved inside itself.",
    );
    expect(await message(user.run((tx) => ops.moveItem(tx, n, archived)))).toBe(
      "That destination is no longer available. Reload to see the latest.",
    );
    const foreign = await other.run((tx) => ops.createItem(tx, "folder", null));
    expect(await message(user.run((tx) => ops.moveItem(tx, n, foreign)))).toBe(
      "That destination no longer exists. Reload to see the latest.",
    );
  });
});

describe("archive, trash, restore, delete forever (3.3)", () => {
  it("archives the whole subtree and lists only the root", async () => {
    const t = await makeTree(user);
    expect(await user.run((tx) => ops.archiveItem(tx, t.f))).toBe(true);
    expect(await statuses(user, [t.f, t.n, t.s, t.sn])).toEqual(Array(4).fill("archived"));
    const roots = await user.run((tx) => ops.loadStatusRoots(tx, "archived"));
    expect(roots.map((r) => r.id)).toContain(t.f);
    expect(roots.map((r) => r.id)).not.toContain(t.n);
    const tree = await user.run((tx) => ops.loadActiveTree(tx));
    expect(tree.some((r) => r.id === t.n)).toBe(false);
  });

  it("restores the subtree to its original place", async () => {
    const t = await makeTree(user);
    await user.run((tx) => ops.trashItem(tx, t.s));
    expect(await user.run((tx) => ops.restoreItem(tx, t.s))).toBe(true);
    expect(await statuses(user, [t.s, t.sn])).toEqual(["active", "active"]);
    expect((await user.run((tx) => get(tx, t.s))).parentId).toBe(t.f);
  });

  it("keeps separately trashed items in Trash when their folder is restored", async () => {
    const t = await makeTree(user);
    await user.run((tx) => ops.trashItem(tx, t.n));
    await user.run((tx) => ops.trashItem(tx, t.f));
    const trash = (await user.run((tx) => ops.loadStatusRoots(tx, "trashed"))).map((r) => r.id);
    expect(trash).toEqual(expect.arrayContaining([t.f, t.n]));
    await user.run((tx) => ops.restoreItem(tx, t.f));
    expect(await statuses(user, [t.f, t.s, t.sn, t.n])).toEqual([
      "active",
      "active",
      "active",
      "trashed",
    ]);
  });

  it("restores to the root when the parent is no longer active", async () => {
    const t = await makeTree(user);
    await user.run((tx) => ops.trashItem(tx, t.n));
    await user.run((tx) => ops.trashItem(tx, t.f));
    await user.run((tx) => ops.restoreItem(tx, t.n));
    const note = await user.run((tx) => get(tx, t.n));
    expect(note).toMatchObject({ status: "active", parentId: null });
  });

  it("moves an archived item and its contents to Trash", async () => {
    const t = await makeTree(user);
    await user.run((tx) => ops.archiveItem(tx, t.f));
    expect(await user.run((tx) => ops.trashItem(tx, t.f))).toBe(true);
    expect(await statuses(user, [t.f, t.n, t.s, t.sn])).toEqual(Array(4).fill("trashed"));
    const archived = (await user.run((tx) => ops.loadStatusRoots(tx, "archived"))).map((r) => r.id);
    expect(archived).not.toContain(t.f);
  });

  it("deletes forever the item and everything inside, including separately trashed items", async () => {
    const t = await makeTree(user);
    await user.run((tx) => ops.trashItem(tx, t.n));
    await user.run((tx) => ops.trashItem(tx, t.f));
    expect(await user.run((tx) => ops.deleteForever(tx, t.f))).toBe(true);
    expect(await statuses(user, [t.f, t.n, t.s, t.sn])).toEqual(Array(4).fill("gone"));
  });

  it("refuses to delete forever items that are not trashed roots", async () => {
    const t = await makeTree(user);
    expect(await user.run((tx) => ops.deleteForever(tx, t.f))).toBe(false);
    await user.run((tx) => ops.archiveItem(tx, t.f));
    expect(await user.run((tx) => ops.deleteForever(tx, t.f))).toBe(false);
    await user.run((tx) => ops.trashItem(tx, t.f));
    expect(await user.run((tx) => ops.deleteForever(tx, t.n))).toBe(false); // inside, not a root
    expect(await statuses(user, [t.f, t.n])).toEqual(["trashed", "trashed"]);
  });

  it("leaves edited_at unchanged when archiving, trashing, and restoring", async () => {
    const t = await makeTree(user);
    const before = (await user.run((tx) => get(tx, t.n))).editedAt.getTime();
    await pause();
    await user.run((tx) => ops.archiveItem(tx, t.f));
    await user.run((tx) => ops.restoreItem(tx, t.f));
    await user.run((tx) => ops.trashItem(tx, t.f));
    await user.run((tx) => ops.restoreItem(tx, t.f));
    expect((await user.run((tx) => get(tx, t.n))).editedAt.getTime()).toBe(before);
  });
});

describe("other users cannot affect a user's items (3.4)", () => {
  it("every tree operation by another user changes nothing", async () => {
    const t = await makeTree(user);
    const p = await user.run((tx) => ops.createItem(tx, "project", null));
    await user.run((tx) => ops.trashItem(tx, t.n));

    const attempts = await other.run(async (tx) => [
      await ops.renameItem(tx, t.f, "hijacked"),
      await ops.setProjectStyle(tx, p, { icon: "flag", color: "red" }),
      await ops.convertItem(tx, t.f, "project"),
      await ops.moveItem(tx, t.s, null),
      await ops.archiveItem(tx, t.f),
      await ops.trashItem(tx, t.s),
      await ops.restoreItem(tx, t.n),
      await ops.deleteForever(tx, t.n),
      (await ops.getActiveItem(tx, t.f)) !== undefined,
      (await ops.loadActiveTree(tx)).some((r) => r.id === t.f),
    ]);
    expect(attempts).toEqual(Array(10).fill(false));

    const f = await user.run((tx) => get(tx, t.f));
    expect(f).toMatchObject({ title: "", kind: "folder", status: "active" });
    expect(await statuses(user, [t.s, t.n])).toEqual(["active", "trashed"]);
    expect((await user.run((tx) => get(tx, p))).icon).toBeNull();
  });

  it("cannot create items inside another user's folder", async () => {
    const f = await user.run((tx) => ops.createItem(tx, "folder", null));
    const message = await other
      .run((tx) => ops.createItem(tx, "note", f))
      .then(() => "NO ERROR", treeErrorMessage);
    expect(message).toBe("That destination no longer exists. Reload to see the latest.");
  });
});
