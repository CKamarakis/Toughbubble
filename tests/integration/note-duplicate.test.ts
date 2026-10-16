import type { JSONContent } from "@tiptap/core";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { UserTx } from "@/db/client";
import { attachments, itemContent, items } from "@/db/schema";
import * as files from "@/lib/attachments/operations";
import * as notes from "@/lib/notes/operations";
import { EMPTY_DOC } from "@/lib/notes/validate";
import * as tree from "@/lib/tree/operations";
import { sidebarCompare } from "@/lib/tree/order";
import { createTestUser, deleteTestUser, storageAdmin, type TestUser } from "./harness";

// Duplicate a note (workspace-tree spec "Duplicate a note", design D10).

let user: TestUser;
let other: TestUser;
const stored: string[] = [];

beforeAll(async () => {
  [user, other] = await Promise.all([createTestUser(), createTestUser()]);
});

afterAll(async () => {
  if (stored.length) await storageAdmin().remove(stored);
  await Promise.all([user, other].filter(Boolean).map(deleteTestUser));
});

const bucketOf = async (u: TestUser) => (await u.client()).storage.from("attachments");
const newNote = (u: TestUser = user) => u.run((tx) => tree.createItem(tx, "note", null));
const save = (id: string, body: JSONContent, base: number, as: TestUser = user) =>
  as.run((tx) => notes.saveNoteBody(tx, id, body, base));
const load = (id: string) => user.run((tx) => notes.getNoteBody(tx, id));
const duplicate = async (id: string, as: TestUser = user) => {
  const bucket = await bucketOf(as);
  return as.run((tx) => notes.duplicateNote(tx, bucket, id));
};
const rename = (id: string, title: string) => user.run((tx) => tree.renameItem(tx, id, title));
const titleOf = (id: string) =>
  user.run(async (tx) => (await tx.select({ title: items.title }).from(items).where(eq(items.id, id)))[0]?.title);
const rowCount = (id: string) =>
  user.run((tx) => tx.select({ id: itemContent.itemId }).from(itemContent).where(eq(itemContent.itemId, id)).then((r) => r.length));
const attachmentRows = (u: TestUser, itemId: string) =>
  u.run((tx) => tx.select().from(attachments).where(eq(attachments.itemId, itemId)));
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

/** Starts, uploads, and finishes an attachment; returns its id and path. */
async function attach(u: TestUser, noteId: string, bytes = new Uint8Array([1, 2, 3, 4])) {
  const started = await u.run((tx) =>
    files.startAttachment(tx, noteId, { name: "photo.png", type: "image/png", size: bytes.length, width: 2, height: 2 }),
  );
  if (started.status !== "started") throw new Error(started.status);
  const bucket = await bucketOf(u);
  const up = await bucket.upload(started.path, new Blob([bytes]), { contentType: "image/png" });
  if (up.error) throw up.error;
  stored.push(started.path);
  const finished = await u.run((tx) => files.finishAttachment(tx, bucket, started.id));
  expect(finished.status).toBe("ready");
  return started;
}

const boldLine: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Big idea", marks: [{ type: "bold" }] }] }],
};
const image = (attachmentId: string): JSONContent => ({
  type: "image",
  attrs: { attachmentId, copyOf: null, alt: "chart", width: 300, align: "center" },
});
const withImages = (...ids: string[]): JSONContent => ({
  type: "doc",
  content: [...ids.map(image), { type: "paragraph", content: [{ type: "text", text: "after" }] }],
});
const imageIds = (doc: JSONContent) =>
  (doc.content ?? []).filter((n) => n.type === "image").map((n) => n.attrs?.attachmentId as string);

describe("duplicate a note", () => {
  it('copies the body as "<title> (copy)" directly below the original', async () => {
    const a = await newNote();
    const id = await newNote();
    const c = await newNote();
    await rename(id, "Ideas");
    await save(id, boldLine, 0);

    const copy = (await duplicate(id))!;
    expect(copy).toEqual(expect.any(String));
    expect(copy).not.toBe(id);
    expect(await titleOf(copy)).toBe("Ideas (copy)");
    const copied = await load(copy);
    expect(copied?.version).toBe(1);
    expect(copied?.body).toEqual((await load(id))!.body);

    const order = await siblingOrder(null);
    expect(order.indexOf(copy)).toBe(order.indexOf(id) + 1);
    expect(order.indexOf(c)).toBeLessThan(order.indexOf(a));
  });

  it("never-written note → the copy has no content row and opens empty", async () => {
    const id = await newNote();
    const copy = (await duplicate(id))!;
    expect(await titleOf(copy)).toBe("Untitled note (copy)");
    expect(await rowCount(copy)).toBe(0);
    expect(await load(copy)).toEqual({ body: EMPTY_DOC, version: 0 });
  });

  it('200-char title → copy title ends with " (copy)" and is 200 chars', async () => {
    const id = await newNote();
    await rename(id, "x".repeat(200));
    const title = await titleOf((await duplicate(id))!);
    expect(title).toHaveLength(200);
    expect(title!.endsWith(" (copy)")).toBe(true);
  });

  it("saving to the copy leaves the original unchanged", async () => {
    const id = await newNote();
    await save(id, boldLine, 0);
    const original = (await load(id))!.body;
    const copy = (await duplicate(id))!;
    expect((await save(copy, withImages(), 1)).status).toBe("saved");
    expect(await load(id)).toEqual({ body: original, version: 1 });
  });

  it("a storm's id or another user's note → null", async () => {
    const storm = await user.run((tx) => tree.createItem(tx, "storm", null));
    expect(await duplicate(storm)).toBeNull();
    expect(await duplicate(await newNote(), other)).toBeNull();
  });
});

describe("duplicate a note with attachments", () => {
  it("copies each attachment into a new row and rewrites the ids in the copied body", async () => {
    const id = await newNote();
    const a = await attach(user, id);
    const b = await attach(user, id, new Uint8Array([5, 6]));
    await save(id, withImages(a.id, b.id), 0);

    const copy = (await duplicate(id))!;
    const rows = await attachmentRows(user, copy);
    rows.forEach((r) => stored.push(`${user.id}/${copy}/${r.id}`));
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === "ready")).toBe(true);

    const body = (await load(copy))!.body;
    const ids = imageIds(body);
    expect(ids.sort()).toEqual(rows.map((r) => r.id).sort());
    expect(ids).not.toContain(a.id);
    expect(ids).not.toContain(b.id);
    // Apart from the ids, the body is the same.
    const original = (await load(id))!.body;
    const idsOf = imageIds(original);
    expect(body.content!.map((n, i) => (n.type === "image" ? { ...n, attrs: { ...n.attrs, attachmentId: idsOf[i] } } : n))).toEqual(
      original.content,
    );
    // The copy's own attachments pass the "own attachments only" check on save.
    expect((await save(copy, body, 1)).status).toBe("saved");
  });

  it("deleting the original forever leaves the copy's attachment rows and files", async () => {
    const id = await newNote();
    const a = await attach(user, id);
    await save(id, withImages(a.id), 0);
    const copy = (await duplicate(id))!;
    const [copied] = await attachmentRows(user, copy);
    stored.push(`${user.id}/${copy}/${copied.id}`);

    // What the deleteForever action does.
    await user.run((tx) => tree.trashItem(tx, id));
    const paths = await user.run(async (tx) => {
      const found = await files.attachmentPathsUnder(tx, id);
      expect(await tree.deleteForever(tx, id)).toBe(true);
      return found;
    });
    expect(paths).toEqual([a.path]);
    expect(await files.removeStoredFiles(await bucketOf(user), paths)).toBe(true);

    expect(await attachmentRows(user, copy)).toHaveLength(1);
    const bucket = await bucketOf(user);
    const links = await user.run((tx) => files.getAttachmentLinks(tx, bucket, copy));
    const res = await fetch(links[copied.id]);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it("drops an attachment that can't be copied from the copied body", async () => {
    const id = await newNote();
    const a = await attach(user, id);
    await save(id, withImages(a.id), 0);
    // The file is gone from Storage, so the copy fails.
    await (await bucketOf(user)).remove([a.path]);

    const copy = (await duplicate(id))!;
    expect(await attachmentRows(user, copy)).toHaveLength(0);
    const body = (await load(copy))!.body;
    expect(imageIds(body)).toEqual([]);
    expect(body.content).toEqual([{ type: "paragraph", content: [{ type: "text", text: "after" }] }]);
  });

  it("removes the copied files when the transaction fails", async () => {
    const id = await newNote();
    const a = await attach(user, id);
    await save(id, withImages(a.id), 0);
    const bucket = await bucketOf(user);

    let copyId: string | null = null;
    // The work succeeds, then the transaction fails (as a failed commit would).
    const failingRun = ((fn: (tx: UserTx) => Promise<unknown>) =>
      user.run(async (tx) => {
        copyId = (await fn(tx)) as string;
        throw new Error("commit failed");
      })) as TestUser["run"];
    await expect(notes.duplicateNoteCleanly(failingRun, bucket, id)).rejects.toThrow("commit failed");

    expect(copyId).toEqual(expect.any(String));
    const listed = await storageAdmin().list(`${user.id}/${copyId}`);
    expect(listed.data ?? []).toEqual([]);
    // The original's file is untouched.
    expect((await storageAdmin().download(a.path)).error).toBeNull();
  });
});
